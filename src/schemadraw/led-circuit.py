from schemdraw import Drawing
import schemdraw.elements as elm

with Drawing(file='led_circuit_schemdraw.svg') as d:
    d += elm.SourceV().label('+5V', loc='top')
    d += elm.Line().right()
    d += elm.Resistor().down().label('150Ω')
    d += elm.Line().down()
    d += elm.LED().left().label('Red LED', loc='bottom')
    d += elm.Line().up()
    d += elm.Ground()