from schemdraw import Drawing
import schemdraw.elements as elm
import matplotlib.pyplot as plt

with Drawing(file='led-circuit-battery.svg') as d:
    # Vertical battery on the left with "+" on top
    vsrc = d.add(elm.Battery().up().reverse().label('+5V', loc='top'))
    
    # Top branch - just a wire at the top
    d += elm.Line().right()

    # Right side of the circuit vertical resistor to LED
    d += elm.Resistor().down().label('150 Ω')
    d += elm.LED().down().label('Red LED')
    
    # Horizontal line back toward the battery
    d += elm.Line().left().length(3)
    
    # Draw ground here
    gnd = d.add(elm.Ground())
    
    # Connect ground up to the negative battery terminal with a separate line
    # Draw a vertical line up from the ground to the negative terminal
    # Do not draw over the battery
    d += elm.Line().up().length(3)

    # Save PNG with white background
    fig = d.draw(show=False)
    plt.savefig('led-circuit-battery.png', dpi=300, bbox_inches='tight', facecolor='white')
