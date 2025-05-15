import schemdraw
import schemdraw.elements as elm

with schemdraw.Drawing():
    elm.SourceV().up().label('5V')
    elm.Line().right()
    elm.Resistor().down().label('150 Ω')
    elm.LED().label('Red LED')
    elm.Line().left()
    elm.Ground()
    elm.Line().up()
    
