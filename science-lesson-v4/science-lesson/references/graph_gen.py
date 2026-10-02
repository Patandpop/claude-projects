#!/usr/bin/env python3
"""
M1: Fixed graph renderer — called by build.js via execSync. Never regenerated per lesson.

CLI usage:
    python graph_gen.py <input.json>                    (build.js: outPath read from JSON)
    python graph_gen.py '<json_data_string>' <output.png>  (direct CLI)

json_data fields:
    headers          list[str]  — column headers; axis labels derived from these
    rows             list[list] — data rows
    xCol             int        — index of x column (default 0)
    yCol             int        — index of y column (default last column)
    xIntercept       bool       — whether to extrapolate to y=0 (default true)
    interceptLabel   str        — annotation label for the x-intercept
    interceptAccepted float     — accepted value for % error (optional)
    compact          bool       — compact mode for Variant B (no stats box, smaller figure)
    title            str        — optional override title
    fit              str        — "auto" (default) | "linear" | "curve"
                                  linear: straight line of best fit, gradient, intercepts,
                                          dashed extrapolation to the x-intercept (straight-line
                                          practicals: latent heat, absolute zero, Hooke's law)
                                  curve:  smooth curve of best fit over the data range only; no
                                          extrapolation, no intercept, no straight-line stats
                                          (rates, P against V, enzyme optimum, cooling curves)
                                  auto:   curve when a straight line clearly does not fit
                                          (R² < 0.98 AND a quadratic halves the leftover error)
"""
import sys
import json
import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

NAVY, GOLD, AMBER, RED, WHITE = '#152347', '#FABB2E', '#E65100', '#E42431', '#FFFFFF'


def _unit(header):
    """Extract unit string from 'Label (unit)' header format."""
    return header.split('(')[-1].rstrip(')').strip() if '(' in header else ''


def _r2(ys, pred):
    ss_tot = np.sum((ys - ys.mean()) ** 2)
    return 1 - np.sum((ys - pred) ** 2) / ss_tot if ss_tot != 0 else 1.0


def choose_fit(xs, ys, requested='auto'):
    """'linear' or 'curve'. Explicit requests win; 'auto' only calls data curved when a
    straight line is clearly wrong, so noisy straight-line practicals stay linear."""
    if requested in ('linear', 'curve'):
        return requested
    if len(xs) < 3:
        return 'linear'
    lin_res = np.sum((ys - np.polyval(np.polyfit(xs, ys, 1), xs)) ** 2)
    quad_res = np.sum((ys - np.polyval(np.polyfit(xs, ys, 2), xs)) ** 2)
    curved = _r2(ys, np.polyval(np.polyfit(xs, ys, 1), xs)) < 0.98 and quad_res < 0.5 * lin_res
    return 'curve' if curved else 'linear'


def _pchip(xs, ys, xq):
    """Fritsch-Carlson monotone cubic through the points (numpy only, no scipy):
    smooth, never overshoots, so a levelling-off curve stays level."""
    h = np.diff(xs)
    d = np.diff(ys) / h
    m = np.zeros_like(ys)
    for k in range(1, len(xs) - 1):
        if d[k - 1] * d[k] > 0:
            w1, w2 = 2 * h[k] + h[k - 1], h[k] + 2 * h[k - 1]
            m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k])
    m[0], m[-1] = d[0], d[-1]
    idx = np.clip(np.searchsorted(xs, xq) - 1, 0, len(xs) - 2)
    t = (xq - xs[idx]) / h[idx]
    h00, h10 = 2 * t**3 - 3 * t**2 + 1, t**3 - 2 * t**2 + t
    h01, h11 = -2 * t**3 + 3 * t**2, t**3 - t**2
    return h00 * ys[idx] + h10 * h[idx] * m[idx] + h01 * ys[idx + 1] + h11 * h[idx] * m[idx + 1]


def _shape_ok(xs, ys, yq):
    """A fitted curve must keep the data's shape: if the data only rises (or only
    falls) the curve may not turn back, and if the data only ever bends one way
    (levelling off, or inverse proportion) the curve may not flip its bend."""
    tol = 1e-6 * (np.ptp(ys) or 1.0)
    steps = np.diff(ys)
    dq = np.diff(yq)
    if np.all(steps >= 0) and np.any(dq < -tol):
        return False
    if np.all(steps <= 0) and np.any(dq > tol):
        return False
    if len(xs) >= 3:
        bends = np.diff(steps / np.diff(xs))       # change in slope between neighbouring points
        ddq = np.diff(dq)
        btol = 0.02 * (np.max(np.abs(ddq)) or 1.0)  # ignore rounding-sized wobbles in the bend
        if np.all(bends < 0) and np.any(ddq > btol):
            return False
        if np.all(bends > 0) and np.any(ddq < -btol):
            return False
    return True


def _plateau_fit(xs, ys):
    """y = A + B·e^(-k·(x - x0)): rises (or falls) and levels off. Fits rate-of-reaction
    curves, cooling curves, decay. k is found by a 1-D search; A and B by least squares."""
    x0, span = xs.min(), np.ptp(xs) or 1.0
    best = None
    for k in np.logspace(np.log10(0.1 / span), np.log10(30 / span), 400):
        M = np.column_stack([np.ones_like(xs), np.exp(-k * (xs - x0))])
        coef, *_ = np.linalg.lstsq(M, ys, rcond=None)
        sse = np.sum((M @ coef - ys) ** 2)
        if best is None or sse < best[0]:
            best = (sse, k, coef)
    _, k, (A, B) = best
    return lambda x: A + B * np.exp(-k * (x - x0))


def curve_of_best_fit(xs, ys, xq):
    """Smooth curve over the data range. Tries, in order: a quadratic, a power law
    (y = a·x^n, which covers inverse proportion such as P against V), a levelling-off
    curve (_plateau_fit: rates, cooling, decay), then a cubic.
    The first that fits well (R² >= 0.99) and keeps the data's shape (_shape_ok) wins.
    Otherwise a monotone curve through the points (never overshoots)."""
    order = np.argsort(xs)
    xs, ys = xs[order], ys[order]
    candidates = []
    if len(xs) > 2:
        candidates.append(lambda x, c=np.polyfit(xs, ys, 2): np.polyval(c, x))
    if np.all(xs > 0) and (np.all(ys > 0) or np.all(ys < 0)) and len(xs) > 2:
        sign = 1.0 if ys[0] > 0 else -1.0
        n, ln_a = np.polyfit(np.log(xs), np.log(sign * ys), 1)
        candidates.append(lambda x, n=n, a=np.exp(ln_a), s=sign: s * a * np.power(x, n))
    if len(xs) > 3:
        candidates.append(_plateau_fit(xs, ys))
    if len(xs) > 3:
        candidates.append(lambda x, c=np.polyfit(xs, ys, 3): np.polyval(c, x))
    for f in candidates:
        if _r2(ys, f(xs)) >= 0.99 and _shape_ok(xs, ys, f(xq)):
            return f(xq)
    if len(xs) >= 3 and not (np.all(np.diff(ys) >= 0) or np.all(np.diff(ys) <= 0)):
        return np.polyval(np.polyfit(xs, ys, 2), xq)   # a peak or trough (enzyme optimum)
    return _pchip(xs, ys, xq)


def render(data, out_path, compact=False):
    """
    Render the V2 dark-style scatter + best-fit graph.

    Parameters
    ----------
    data     : dict   parsed JSON data object
    out_path : str    path where the PNG will be written
    compact  : bool   if True, omit stats box and use smaller figure size (M3)
    """
    hdrs     = data.get('headers', ['x', 'y'])
    rows     = data.get('rows', [])
    xc       = int(data.get('xCol', 0))
    yc       = int(data.get('yCol', len(hdrs) - 1))
    do_xi    = data.get('xIntercept', True)
    xi_lbl   = data.get('interceptLabel', 'x-intercept')
    accepted = data.get('interceptAccepted')

    xs = np.array([float(r[xc]) for r in rows])
    ys = np.array([float(r[yc]) for r in rows])

    # 2026-10-02: straight line only when the data is a straight line. Before this,
    # every dataset got a linear fit and an extrapolated x-intercept, including
    # rate curves (intercept at -57.6 s) and pressure against volume.
    fit = choose_fit(xs, ys, str(data.get('fit', 'auto')).lower())
    is_curve = fit == 'curve'

    # M7: linear regression via numpy.polyfit degree 1
    m, b = np.polyfit(xs, ys, 1)

    # R² — for stats box
    r2 = _r2(ys, m * xs + b)

    # N1: x-intercept disabled when xIntercept=false; never on a curve
    xi = (-b / m) if (do_xi and m != 0 and not is_curve) else None

    x0, x1 = xs.min(), xs.max()
    data_range = x1 - x0

    # M7: extrapolation range — extend 20% beyond x-intercept
    if xi is not None:
        # left edge: 20% beyond x-intercept relative to the intercept-to-data span
        extra = abs(x0 - xi) * 0.20
        xl = xi - extra
        xr = x1 + data_range * 0.08
    else:
        xl = x0 - data_range * 0.10
        xr = x1 + data_range * 0.10

    # M3: compact flag shrinks figure for Variant B
    fig, ax = plt.subplots(figsize=(5.5, 4.2) if compact else (8.5, 5.5))
    fig.patch.set_facecolor(NAVY)
    ax.set_facecolor(NAVY)

    for sp in ax.spines.values():
        sp.set_color(GOLD)
    ax.tick_params(colors=GOLD, labelsize=18)
    ax.set_xlim(xl, xr)

    y_mg = (ys.max() - ys.min()) * 0.12
    ax.set_ylim(min(0, ys.min() - y_mg), ys.max() + y_mg)
    ax.xaxis.set_major_locator(MaxNLocator(nbins=5))
    ax.yaxis.set_major_locator(MaxNLocator(nbins=5))

    # No gridlines (spec: "No gridlines or very faint ones") — skip entirely
    ax.grid(False)

    # M6: axis labels from headers
    x_hdr = hdrs[xc] if xc < len(hdrs) else 'x'
    y_hdr = hdrs[yc] if yc < len(hdrs) else 'y'
    ax.set_xlabel(x_hdr, color=GOLD, fontsize=18)
    ax.set_ylabel(y_hdr, color=GOLD, fontsize=18)

    # Red shaded vertical band at x-intercept (M2)
    if xi is not None:
        bw = (xr - xl) * 0.012
        ax.axvspan(xi - bw, xi + bw, color=RED, alpha=0.40, zorder=2)

    # Amber dashed extrapolation line — from xl to start of data range (M2)
    if xi is not None:
        xe = np.linspace(xl, x0, 300)
        ax.plot(xe, m * xe + b, color=AMBER, lw=1.8, ls='--', zorder=3)

    # Gold solid best-fit line (or curve) — data range only (M2)
    xf = np.linspace(x0, x1, 300)
    ax.plot(xf, curve_of_best_fit(xs, ys, xf) if is_curve else m * xf + b, color=GOLD, lw=2.0, zorder=4)

    # Gold scatter points — no coordinate labels on points (M2)
    ax.scatter(xs, ys, color=GOLD, s=70, zorder=5)

    # Stats box top-left — M2; skipped in compact mode (M3). Gradient, intercepts and
    # R² describe a straight line, so a curve gets no stats box at all.
    if not compact and not is_curve:
        xu = _unit(x_hdr)
        yu = _unit(y_hdr)
        # gradient units: y-unit / x-unit
        if yu and xu:
            grad_unit = f'{yu} {xu}⁻¹'  # e.g. "kPa °C⁻¹"
        elif yu:
            grad_unit = yu
        else:
            grad_unit = ''

        lines = [
            f'Gradient = {m:.3g}' + (f' {grad_unit}' if grad_unit else ''),
            f'y-intercept = {b:.2f}' + (f' {yu}' if yu else ''),
            f'R² = {r2:.4f}',  # R²
        ]
        if xi is not None:
            lines.append(f'Est. x-intercept = {xi:.2f}' + (f' {xu}' if xu else ''))
        # M8: % error when interceptAccepted provided
        if accepted is not None and xi is not None:
            pct = abs(xi - float(accepted)) / abs(float(accepted)) * 100
            lines.append(f'% error = {pct:.2f}%')

        ax.text(
            0.02, 0.98, '\n'.join(lines),
            transform=ax.transAxes,
            color=GOLD, fontsize=9, fontweight='bold',
            va='top', ha='left',
            bbox=dict(facecolor=NAVY, edgecolor=GOLD, boxstyle='round,pad=0.45', lw=1.5),
        )

    plt.tight_layout(pad=0.5)
    plt.savefig(out_path, dpi=160, bbox_inches='tight', facecolor=NAVY)
    plt.close()
    return out_path


if __name__ == '__main__':
    # Two calling conventions, both supported:
    #   python graph_gen.py <input.json>              — build.js callGraphGen(): JSON file path,
    #                                                    output path in the JSON's "outPath" field
    #   python graph_gen.py '<json_string>' <out.png> — direct CLI: inline JSON + explicit output
    if len(sys.argv) < 2:
        print('Usage: python graph_gen.py <input.json> | \'<json_string>\' <output.png>', file=sys.stderr)
        sys.exit(1)

    arg1 = sys.argv[1]
    try:
        if os.path.isfile(arg1):
            with open(arg1, encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = json.loads(arg1)
    except (json.JSONDecodeError, OSError, ValueError) as e:
        print(f'graph_gen: invalid JSON argument: {e}', file=sys.stderr)
        sys.exit(1)

    out_path = sys.argv[2] if len(sys.argv) > 2 else data.get('outPath')
    if not out_path:
        print('graph_gen: no output path — pass <output.png> or set "outPath" in the JSON', file=sys.stderr)
        sys.exit(1)

    compact = data.get('compact', False)
    result = render(data, out_path, compact=compact)
    if not os.path.exists(result):
        print(f'graph_gen: output not written: {result}', file=sys.stderr)
        sys.exit(1)
