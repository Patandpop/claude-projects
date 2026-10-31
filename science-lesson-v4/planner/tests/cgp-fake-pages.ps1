# cgp-fake-pages.ps1: draws a small made-up revision-guide book (12 page pictures) in the shape of a CGP guide, so
# planner/tools/cgp-index.js can be tested without anyone's book or login. Nothing here is copied from a real book:
# the topic names are ordinary GCSE physics words, the sentences are invented.
#   powershell -NoProfile -ExecutionPolicy Bypass -File planner/tests/cgp-fake-pages.ps1 -Out <folder>
param([Parameter(Mandatory = $true)][string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Out | Out-Null
$W = 1240; $H = 1754   # an A4 page at 150 dots per inch, about what a zoomed screenshot gives

function Page($n, $draw) {
  $bmp = New-Object System.Drawing.Bitmap $W, $H
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White); $g.TextRenderingHint = 'AntiAlias'
  & $draw $g
  if ($n -gt 0) {
    $f = New-Object System.Drawing.Font('Arial', 16, [System.Drawing.FontStyle]::Bold)
    $x = if ($n % 2 -eq 0) { 60 } else { $W - 110 }
    $g.DrawString([string]$n, $f, [System.Drawing.Brushes]::Black, $x, $H - 70)
  }
  $g.Dispose()
  $name = Join-Path $Out ('page-{0:d4}.png' -f ($n + 2))   # picture order = book order; the cover is page-0002
  $bmp.Save($name); $bmp.Dispose()
}
function Band($g, $text) {   # the big title band at the top of a topic page
  $g.FillRectangle([System.Drawing.Brushes]::LightGray, 60, 50, $W - 120, 90)
  $f = New-Object System.Drawing.Font('Arial', 34, [System.Drawing.FontStyle]::Bold)
  $g.DrawString($text, $f, [System.Drawing.Brushes]::Black, 80, 68)
}
function Body($g, $y, $lines, $size = 15) {
  $f = New-Object System.Drawing.Font('Arial', $size)
  foreach ($l in $lines) { $g.DrawString($l, $f, [System.Drawing.Brushes]::Black, 80, $y); $y += [int]($size * 2.2) }
  return $y
}
function Sub($g, $y, $text) {   # a smaller heading inside a page
  $f = New-Object System.Drawing.Font('Arial', 22, [System.Drawing.FontStyle]::Bold)
  $g.DrawString($text, $f, [System.Drawing.Brushes]::Black, 80, $y); return $y + 50
}
function Strip($g, $text) {   # the topic strip at the very top edge, as the guides print the topic name over each page
  $f = New-Object System.Drawing.Font('Arial', 12)
  $g.DrawString($text, $f, [System.Drawing.Brushes]::DimGray, $W - 420, 14)
}

# cover (no page number)
Page 0 { param($g) $f = New-Object System.Drawing.Font('Arial', 60, [System.Drawing.FontStyle]::Bold); $g.DrawString("Made-up Physics`nRevision Guide", $f, [System.Drawing.Brushes]::Black, 120, 500) }
# contents, page 1
Page 1 { param($g) Band $g 'Contents'; $y = 200
  $y = Body $g $y @('Topic 1: Energy', '   Energy Stores and Systems .......... 2', '   Kinetic and Potential Energy Stores .......... 3', '   Specific Heat Capacity .......... 4', '   Warm-Up and Exam Questions .......... 5', '   Revision Summary for Topic 1 .......... 6', 'Topic 2: Electricity', '   Current and Circuit Symbols .......... 7', '   Resistance and V = IR .......... 8', 'Answers .......... 9', 'Index .......... 10') 17 }
# topic pages
Page 2 { param($g) Strip $g 'Topic 1: Energy'; Band $g 'Energy Stores and Systems'; $y = 200
  $y = Body $g $y @('Energy can be held in different stores. A system is just the object or group of objects', 'that you are looking at. When a system changes, energy is moved between its stores.', 'Closed systems have no energy entering or leaving them overall.')
  $y = Sub $g ($y + 30) 'Energy is Transferred Between Stores'
  $y = Body $g $y @('A ball thrown upwards slows down as energy moves from its kinetic store to its gravitational', 'potential store. Friction moves energy to the thermal stores of the surfaces.')
  $y = Sub $g ($H - 420) 'Warm-Up Questions'
  $y = Body $g $y @('Q1  Name four energy stores.', 'Q2  What is a closed system?', 'Q3  Describe the energy transfer when a kettle boils water.') 14 }
Page 3 { param($g) Strip $g 'Topic 1: Energy'; Band $g 'Kinetic and Potential Energy Stores'; $y = 200
  $y = Body $g $y @('Anything moving has energy in its kinetic store. The faster it moves, the more it has.', 'Kinetic energy = 0.5 x mass x speed squared. Mass is in kg and speed in m/s.')
  $y = Sub $g ($y + 30) 'Raised Objects Store Energy in Gravitational Potential Stores'
  $y = Body $g $y @('Lifting an object moves energy to its gravitational potential store. The energy depends on', 'the mass, the height and the gravitational field strength (9.8 N/kg on Earth).')
  $y = Sub $g ($H - 420) 'Warm-Up Questions'
  $y = Body $g $y @('Q1  Write the equation for kinetic energy.', 'Q2  A 2 kg bag is lifted 3 m. How much energy is in its gravitational potential store?') 14 }
Page 4 { param($g) Strip $g 'Topic 1: Energy'; Band $g 'Specific Heat Capacity'; $y = 200
  $y = Body $g $y @('Specific heat capacity is the energy needed to raise 1 kg of a substance by 1 degree C.', 'Change in thermal energy = mass x specific heat capacity x temperature change.')
  $y = Sub $g ($y + 30) 'Required Practical: Investigating Specific Heat Capacity'
  $y = Body $g $y @('Use a block with holes for a heater and a thermometer. Measure the energy supplied with a', 'joulemeter, or work it out from current, potential difference and time.')
  $y = Sub $g ($H - 420) 'Warm-Up Questions'
  $y = Body $g $y @('Q1  Define specific heat capacity.', 'Q2  How much energy heats 0.5 kg of water (4200 J/kg C) by 10 degrees C?') 14 }
Page 5 { param($g) Strip $g 'Topic 1: Energy'; Band $g 'Warm-Up and Exam Questions'; $y = 200
  $y = Sub $g $y 'Warm-Up Questions'
  $y = Body $g $y @('1)  Give one example of a closed system.', '2)  State the units of specific heat capacity.', '3)  A cyclist slows down. Which store does the energy end up in?')
  $y = Sub $g ($y + 40) 'Exam Questions'
  $y = Body $g $y @('1  A 1200 kg car travels at 15 m/s.', '   1.1  Calculate the energy in its kinetic store.   [2 marks]', '   1.2  The car brakes and stops. Describe what happens to this energy.   [3 marks]', '2  Explain why water is used in central heating systems.   [4 marks]') }
Page 6 { param($g) Strip $g 'Topic 1: Energy'; Band $g 'Revision Summary for Topic 1'; $y = 200
  $y = Body $g $y @('Well done, that is Topic 1 finished. Tick each question once you can answer it without looking.', 'Energy Stores and Systems (p.2)', '  1)  List the energy stores.', '  2)  What is a system?', 'Kinetic and Potential Energy Stores (p.3)', '  3)  Write down the equation for kinetic energy and give its units.', 'Specific Heat Capacity (p.4)', '  4)  Describe the required practical.') }
Page 7 { param($g) Strip $g 'Topic 2: Electricity'; Band $g 'Current and Circuit Symbols'; $y = 200
  $y = Body $g $y @('Current is the flow of electrical charge. It only flows round a complete circuit with a', 'source of potential difference. Charge flow = current x time.')
  $y = Sub $g ($H - 420) 'Warm-Up Questions'
  $y = Body $g $y @('Q1  What is current?', 'Q2  Draw the circuit symbol for a cell and for a lamp.') 14 }
Page 8 { param($g) Strip $g 'Topic 2: Electricity'; Band $g 'Resistance and V = IR'; $y = 200
  $y = Body $g $y @('Resistance is anything that slows the flow of charge. Potential difference = current x', 'resistance. A longer wire has more resistance than a short one of the same material.')
  $y = Sub $g ($H - 420) 'Warm-Up Questions'
  $y = Body $g $y @('Q1  State the equation linking potential difference, current and resistance.', 'Q2  A lamp has a resistance of 6 ohms and a current of 2 A. Find the potential difference.') 14 }
Page 9 { param($g) Band $g 'Answers'; $y = 200
  $y = Sub $g $y 'Topic 1: Energy'
  $y = Body $g $y @('Page 5: Warm-Up Questions', '1)  Any sensible example, for example a sealed flask of coffee.', '2)  J/kg C', '3)  The thermal store of the brakes and the surroundings.', 'Page 5: Exam Questions', '1.1  KE = 0.5 x 1200 x 15 x 15 = 135 000 J  [2 marks]', '1.2  Energy moves to the thermal stores of the brakes and the air; the kinetic store falls to zero.  [3 marks]', '2  Water has a high specific heat capacity, so it carries a lot of energy per degree of temperature change.  [4 marks]') 14 }
Page 10 { param($g) Band $g 'Index'; $y = 200
  $y = Body $g $y @('circuit symbols 7', 'closed systems 2', 'current 7, 8', 'kinetic energy 3', 'potential difference 8', 'resistance 8', 'specific heat capacity 4') }
Write-Host "12 fake pages in $Out"
