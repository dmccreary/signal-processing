import schemdraw
import schemdraw.elements as elm

with schemdraw.Drawing():
    elm.Resistor().label('150 Ω')
    elm.LED().down().label('Red LED')
    elm.Line().left()
    elm.Ground()
    elm.SourceV().up().label('5V')
