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

    # M7: linear regression via numpy.polyfit degree 1
    m, b = np.polyfit(xs, ys, 1)

    # R² — for stats box
    y_pred = m * xs + b
    ss_res = np.sum((ys - y_pred) ** 2)
    ss_tot = np.sum((ys - ys.mean()) ** 2)
    r2 = 1 - ss_res / ss_tot if ss_tot != 0 else 1.0

    # N1: x-intercept disabled when xIntercept=false
    xi = (-b / m) if (do_xi and m != 0) else None

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

    # Gold solid best-fit line — data range only (M2)
    xf = np.linspace(x0, x1, 300)
    ax.plot(xf, m * xf + b, color=GOLD, lw=2.0, zorder=4)

    # Gold scatter points — no coordinate labels on points (M2)
    ax.scatter(xs, ys, color=GOLD, s=70, zorder=5)

    # Stats box top-left — M2; skipped in compact mode (M3)
    if not compact:
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
