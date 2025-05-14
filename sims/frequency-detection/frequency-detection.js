let height = 575;
let width = 600;

let translate_dict = {};

let circle_period_label;
let circle_period_label_2;
let circle_period_input;
let circle_period = 0.3;

let resolution_label;
let resolution_input;
let resolution = 1000;

let time_scalar_label;
let time_scalar_input;
let time_scalar = 1;
let time_scalar_admin = 1;

let signal_period_label;
let signal_period_input;
let signal_period = 0.5;

let signal = [];
let signal_cc = [];

let cxy = 0;
let comx = 0;
let comy = 0;
let freq_data = {};

let polarBuffer;
let massBuffer;
let signalBuffer;
let signalBuffer_period;

let running = false;
let lastTime = Date.now();
let diffTime = 0;
let tempTime = 0;
let time = 0;
let polar_tick = 0;

let toggle_spin;

let zoom_scale = 2;
let squeeze = 0.95;

let handle_pause = false;

let autopoll_flag = true;
let flag2=10
let flag1=10
let dxy_calcs = [];
let dxy2_calcs = [];
let dxy_calc_rev = 0;

let font;

let styles = {
    "light-line": {"stroke":127,"strokeWeight":1,"noFill":0},
    "normal-line": {"stroke":0,"strokeWeight":2,"noFill":0},
    "strong-shape": {"stroke":0,"strokeWeight":3,"fill":200},
    "red-circle": {"stroke":[255,0,0],"strokeWeight":1,"fill":[255,0,0]},
    "circle-2": {"stroke":[0,0,0],"strokeWeight":1,"fill":[255,255,0]}
}

function set_style(args) {
    args = styles[args]
    if (undefined != args["stroke"]){stroke(args["stroke"]);}
    if (undefined != args["strokeWeight"]){strokeWeight(args["strokeWeight"]);}
    if (undefined != args["fill"]){fill(args["fill"]);}
    if (undefined != args["noFill"]){noFill();}
}

function preload() {
    font = loadFont('/ee-microsims/sims/frequency-detection/frequency-detection.otf');
}

function register_frame(label,x,y,w,h,vx,vy) {
    let cx = w/2 + x;
    let cy = h/2 + y;
    translate_dict[label] = {x:x,y:y,w:w,h:h,cx:cx,cy:cy,vx:vx,vy:vy,wc:w/2,hc:h/2}
}

function reset_frame(label) {

    let f = translate_dict[label];
    
    set_style("strong-shape")
    rect(f.x,f.y,f.w,f.h)

    set_style("light-line")
    line(f.cx - f.w/2, f.cy,         f.cx + f.w/2, f.cy);
    line(f.cx ,        f.cy - f.h/2, f.cx,         f.cy + f.h/2);
    line(f.cx - f.w/2, f.cy - f.h/4, f.cx + f.w/2, f.cy - f.h/4);
    
    line(f.cx - f.w/4, f.cy - f.h/2, f.cx - f.w/4, f.cy + f.h/2);
    line(f.cx + f.w/4, f.cy - f.h/2, f.cx + f.w/4, f.cy + f.h/2);
    line(f.cx - f.w/2, f.cy + f.h/4, f.cx + f.w/2, f.cy + f.h/4);
    if (label == "freq_graph") {
        set_style("strong-shape")
        rect(f.cx - f.w/2, f.cy + f.h/4, f.w, f.h/4 )
        rect(f.x , f.y, f.w, f.h/4 )
        stroke(0)
        fill(0)
        text("Frequency Strength",f.x+80,f.y+25)
    }
}

function generate_signal(){

    let r,g,b;
    let f = translate_dict["graph"];

    /* 
    (graph_width [f.w] / adjustable_range [zoom_scale]) = pixels per 1 s
    (pixels per 1 s * [signal_period]) = pixels per period
    [resolution] * [signal_period] = # data points = signal.length; 
    pixels per period / # data points = pixels per point (x-axis time, sub 1 rounds)
    */

    let ppp  = f.w * signal_period / zoom_scale;
    let dpx = ppp/(resolution*signal_period);
    let signalBuffer_temp = createFramebuffer({width:ppp,height:f.h})
    
    if (signalBuffer_period != undefined) {signalBuffer_period.remove();}
    if (signalBuffer != undefined) {signalBuffer.remove();}
    signalBuffer_period = createFramebuffer({width:2*f.w,height:f.h});
    signalBuffer = createFramebuffer({width:f.w,height:f.h});

    signal = []
    signal_cc = []
    for (let i = 0; i < signal_period*resolution; i++) {
        signal.push(sin(TWO_PI*i/(resolution*signal_period)));
        r = sin(TWO_PI*i/(resolution*signal_period)) + 1
        g = sin(TWO_PI*i/(resolution*signal_period) - 0.1*PI/2) + 1
        b = sin(TWO_PI*i/(resolution*signal_period) - 0.1*PI)   + 1
        signal_cc.push([r*126,g*126,b*126])
    }

    push(); signalBuffer_temp.begin(); translate(-ppp/2,0);
    noFill(); strokeWeight(2); beginShape();
    for (let i = 0; i < signal.length+1; i+= 1) {
        stroke(signal_cc[i%signal.length])
        vertex(int(i*dpx),int(-squeeze*f.h*signal[i%signal.length] / 2));
    }
    endShape(); 
    signalBuffer_temp.end(); pop(); 
    push(); signalBuffer_period.begin(); 
    translate(-f.w,-f.h/2);
    
    for (let i = 0; i < ceil(f.w/ppp)+1; i++) {
        image(signalBuffer_temp,i*ppp,0);
    }
    signalBuffer_period.end(); pop();
    signalBuffer_temp.remove();
}

function render_signal(){

    reset_frame("graph")

    let f = translate_dict["graph"];
    let dt  = f.w * (polar_tick/resolution % signal_period) / zoom_scale;

    push();
    signalBuffer.begin()
    clear();
    translate(-f.w/2 - dt,-f.h/2);
    image(signalBuffer_period,0,0);
    signalBuffer.end();
    pop();
    image(signalBuffer,f.x,f.y)
    set_style("red-circle")
    iSignal = round((polar_tick/resolution % signal_period) * resolution);
    
    circle(f.x,f.y+f.h/2-f.h/2*signal[iSignal],5)
}

function draw_polar(command){

    let f = translate_dict["circle"];

    let to_tick,line_connect,bTime;
    let r,ii,rx,ry;
    let iSignal,iAngle,dAngle;

    if (command == "reset") {

        push();
        polarBuffer.begin();
        translate(-f.w/2,-f.h/2);
        clear();
        
        set_style("strong-shape")
        circle(f.wc,f.hc,f.w);
        
        set_style("light-line")
        line(f.wc, 0,    f.wc,f.h);
        line(0,    f.hc, f.w, f.hc);
        circle(f.wc,f.hc,f.w*0.25);
        circle(f.wc,f.hc,f.w*0.50);
        circle(f.wc,f.hc,f.w*0.75);

        polarBuffer.end();
        pop(); 
        push();
        massBuffer.begin();
        clear();
        translate(-f.w/2,-f.h/2)
        
        set_style("strong-shape")
        rect(0,0,f.w,f.h)
        set_style("circle-2")
        circle(10,15,5)
        set_style("normal-line")
        fill(0)
        text(" = Center of Mass",13,20)
        massBuffer.end();
        pop();

    } else if (command == "draw") {
        iSignal = round((polar_tick/resolution % signal_period) * resolution);
        iAngle  = TWO_PI*(polar_tick/resolution % circle_period)/circle_period;
        r=signal[iSignal%signal.length]*squeeze*f.h/2;

        push(); 
        translate(f.x+f.wc,f.y+f.hc); 

        if (toggle_spin.checked()){
            rotate(-2*PI*(polar_tick/resolution % circle_period)/circle_period + PI/2);
        }

        image(polarBuffer, -f.w/2,-f.h/2);
        pop(); push(); translate(f.x+f.wc,f.y+f.hc); 

        set_style("red-circle")
        
        if (toggle_spin.checked()){
            circle(0,-r,5);
        } else {
            rx=r*cos(iAngle);
            ry=r*sin(iAngle);
            circle(-rx,-ry,5);
        }

        pop();
        push();
        translate(f.x,f.y-200);
        image(massBuffer,0,0);
        if (cxy !=0 ) {
            translate(f.w/2,f.h/2);
            line(0,10,0.7*f.h*comx/(cxy*2),0.7*f.h*comy/(cxy*2)+10)
            set_style("circle-2")
            circle(0.7*f.h*comx/(cxy*2),0.7*f.h*comy/(cxy*2)+10,10)
        }
        pop(); 

    } else if (command == "update") {
        
        // Figure out data points missed since last update = to_tick
        bTime = floor(time*resolution)/resolution;
        to_tick = round(bTime*resolution - polar_tick);
        polar_tick = round(bTime*resolution);

        // What data point are we currently at in the signal, index
        iSignal = round((bTime % signal_period) * resolution);

        // What rotation are we currently at in polar spin;
        iAngle  = TWO_PI*(bTime % circle_period)/circle_period;

        // Given resolution, what is the degree per point increment 
        dAngle = TWO_PI/(circle_period * resolution);

        // Assuming we didn't just start, connect with the last point.
        line_connect = (bTime - 1/resolution > 0) ? -1 : 0;

        push();
        polarBuffer.begin();
        beginShape();
        set_style("normal-line")

        // Step back to last drawn data point (if line_connect)
        // Continue forward drawing all missed data points
        for (let i = line_connect-to_tick; i <= 0; i++) {
            ii = ceil(abs(i/signal.length));
            ii = int(iSignal + i + ii*signal.length) 
            ii = ii % signal.length

            r = -signal[ii];
            rx = r*cos(iAngle + i*dAngle);
            ry = r*sin(iAngle + i*dAngle);
            stroke(signal_cc[ii])
            vertex(squeeze*rx*f.w/2,squeeze*ry*f.h/2);
            if ( i != -1 ){
                cxy += 1;
                comx += rx;
                comy += ry;
            }
        }

        freq_data[circle_period] = pow(pow(comx/cxy,2)+pow(comy/cxy,2),0.5);

        endShape();
        polarBuffer.end();
        pop();

        push();
        massBuffer.begin();
        
        set_style("normal-line")
        beginShape();
        for (let i = line_connect-to_tick; i <= 0; i++) {
            ii = ceil(abs(i/signal.length));
            ii = int(iSignal + i + ii*signal.length) 
            ii = ii % signal.length
            r = -signal[ii];
            rx = r*cos(iAngle + i*dAngle);
            ry = r*sin(iAngle + i*dAngle);
            vertex(0.7*rx*f.w/2,0.7*ry*f.h/2+10);
        }

        endShape();
        massBuffer.end();
        pop();
    } 
}

function render_frequency(){

    let freqpx,f
    let dt = time*resolution;
    
    reset_frame("freq_graph");
    f = translate_dict["freq_graph"];
    push();
    translate(f.cx,f.cy);
    
    let periods = Object.keys(freq_data)
    for (let i = 0; i<periods.length; i++) {
        set_style("normal-line")
        freqpx = -f.w/2 + float(periods[i]) * f.w/2;
        line(freqpx,f.h/4,freqpx,-freq_data[periods[i]]*(f.h/2)+f.h/4)
        set_style("circle-2")
        circle(freqpx,-freq_data[periods[i]]*(f.h/2)+f.h/4,10)
    }

    pop();
}

// words words words
let b1_x_offset = 60
let b1_y_offset = 410
let b1_x_indent_1 = 5
let b1_x_indent_2 = 85
let b1_y_space_1 = 50
let b1_y_space_2 = 35

function setup() {

    canvas = createCanvas(width, height, WEBGL);
    canvas.parent('p5-canvas');
    translate(-width/2,-height/2);

    textFont(font)

    register_frame("graph",250,250,300,150,zoom_scale,zoom_scale);
    register_frame("freq_graph",250,50,300,150,10,10)
    
    let f = translate_dict["graph"];
    polarBuffer = createFramebuffer({width:150,height:150})
    massBuffer  = createFramebuffer({width:150,height:150})
    register_frame("circle",f.cx - 338, f.cy-75,150,150,1,1);

    strokeWeight(0)
    stroke(0)
    fill(0)
    textSize(15)
    textStyle(NORMAL)
    textAlign(LEFT)

    // Control block
    b1_x_offset = 60
    b1_y_offset = 410
    b1_x_indent_1 = 5
    b1_x_indent_2 = 85
    b1_y_space_1 = 50
    b1_y_space_2 = 35


    let resolution_name = createP("Resolution");
    resolution_name.parent('p5-canvas');
    resolution_name.position(b1_x_offset,b1_y_offset);
    resolution_name.style('text-align','left')
    resolution_name.style('width','50px')

    resolution_label = createP(resolution)
    resolution_label.parent('p5-canvas');
    resolution_label.position(b1_x_offset+b1_x_indent_2,b1_y_offset)
    resolution_label.style('text-align','right')
    resolution_label.style('width','50px')

    resolution_input = createSlider(10,300,resolution,10)
    resolution_input.parent('p5-canvas')
    resolution_input.position(b1_x_offset-b1_x_indent_1,b1_y_offset+b1_y_space_2)
    resolution_input.size(150)

    let time_scalar_name = createP("Speed");
    time_scalar_name.parent('p5-canvas')
    time_scalar_name.position(b1_x_offset,b1_y_offset+b1_y_space_1);
    time_scalar_name.style('text-align','left')
    time_scalar_name.style('width','50px')

    time_scalar_label = createP(time_scalar+"x");
    time_scalar_label.parent('p5-canvas')
    time_scalar_label.position(b1_x_offset+b1_x_indent_2,b1_y_offset+b1_y_space_1);
    time_scalar_label.style('text-align','right')
    time_scalar_label.style('width','50px')

    time_scalar_input = createSlider(0.01,2,time_scalar,0.01)
    time_scalar_input.parent('p5-canvas')
    time_scalar_input.position(b1_x_offset-b1_x_indent_1,b1_y_offset+b1_y_space_2+b1_y_space_1)
    time_scalar_input.size(150)


    let signal_period_name = createP("Signal Period")
    signal_period_name.parent('p5-canvas')
    signal_period_name.position(b1_x_offset,b1_y_offset+2*b1_y_space_1);
    signal_period_name.style('text-align','left')
    signal_period_name.style('width','100px')

    signal_period_label = createP(signal_period +" s")
    signal_period_label.parent('p5-canvas')
    signal_period_label.position(b1_x_offset+b1_x_indent_2,b1_y_offset+2*b1_y_space_1);
    signal_period_label.style('text-align','right')
    signal_period_label.style('width','50px')

    signal_period_input = createSlider(0.1,1,signal_period,0.1)
    signal_period_input.parent('p5-canvas');
    signal_period_input.position(b1_x_offset-b1_x_indent_1,b1_y_offset+2*b1_y_space_1+b1_y_space_2);
    signal_period_input.size(150)
    //END

    circle_period_name = createP("Circle Spin Period")
    circle_period_name.parent('p5-canvas')
    circle_period_name.position(260,450)

    circle_period_label = createP(circle_period +" s")
    circle_period_label.parent('p5-canvas')
    circle_period_label.position(250,470)

    circle_period_label_2 = createP(circle_period +" s")
    circle_period_label_2.parent('p5-canvas')
    circle_period_label_2.position(250,160)

    circle_period_input = createSlider(0.1,2,circle_period,0.05)
    circle_period_input.parent('p5-canvas')
    circle_period_input.position(255,440)
    circle_period_input.size(300)


    let toggle_label = createP("Show Spin")
    toggle_label.parent('p5-canvas')
    toggle_label.position(20+435,450);
    toggle_spin = createCheckbox('');
    toggle_spin.parent('p5-canvas');
    toggle_spin.position(20+470,466)
    toggle_spin.size(100)

    reset_freq = createButton('Reset');
    reset_freq.parent('p5-canvas');
    reset_freq.position(310,500)
    reset_freq.size(50)

    reset_freq.mouseClicked(reset);
    
    play_button = createButton('Play');
    play_button.parent('p5-canvas');
    play_button.position(370,500)
    play_button.size(50)

    play_button.mouseClicked(() => {
        handle_pause = (running) ? true : handle_pause;
        running = !running;
        let msg = (running) ? "Pause" :"Play";
        play_button.html(msg);
    });

    // time me on this one
    let poll_button = createButton('AutoPoll');
    poll_button.parent('p5-canvas');
    poll_button.position(430,500)
    poll_button.size(70)

    poll_button.mouseClicked(() => {
        if (autopoll_flag) {
            
            reset(true,false,false)
            return;
        }
        play_button.html("Pause");
        reset(true,false)
        time_scalar_admin = 20 * 1/time_scalar
        circle_period = 0.1
        circle_period_input.value(circle_period);
        circle_period_label.html(circle_period+" s")
        circle_period_label_2.html(circle_period+" s")
        autopoll_flag = true;
        running = true;
    });

    reset();
}

function draw_lines() {
    let f = translate_dict["graph"];
    let x;
    set_style("light-line");
    stroke(0)
    line(b1_x_offset,b1_y_offset+1.75*b1_y_space_2,b1_x_offset+150,b1_y_offset+1.75*b1_y_space_2)
    line(b1_x_offset,b1_y_offset+1.75*b1_y_space_2+b1_y_space_1,b1_x_offset+150,b1_y_offset+1.75*b1_y_space_2+b1_y_space_1)
    stroke(0,0,255)
    line(250+0.5*circle_period*300,450,250+0.5*circle_period*300,435)
    line(250+0.5*circle_period*300,415,250+0.5*circle_period*300,400)
    line(250+0.5*circle_period*300-10,415,250+0.5*circle_period*300+10,415)
    line(250+0.5*circle_period*300-10,435,250+0.5*circle_period*300+10,435)
    fill(0,0,255)
    beginShape()
    vertex(250+0.5*circle_period*300+5,410)
    vertex(250+0.5*circle_period*300-5,410)
    vertex(250+0.5*circle_period*300,400)
    endShape()

    circle_period_label.position(240+0.5*circle_period*300,400)
    circle_period_label_2.position(240+0.5*circle_period*300,162)
    line(250+0.5*circle_period*300,400,250+0.5*circle_period*300,250)

    x = 250+0.5*circle_period*300
    while ( x < f.x+f.w) {
        line(x,400,x,250)
        x+=0.5*circle_period*300
    }
    line(250+0.5*circle_period*300,250,250+0.5*circle_period*300,200)

    fill(0,0,255)
    beginShape()
    vertex(250+0.5*circle_period*300+5,175)
    vertex(250+0.5*circle_period*300-5,175)
    vertex(250+0.5*circle_period*300,165)
    endShape()

    fill(180)
    stroke(0)
    strokeWeight(3)

    rect(f.x,f.y-25,f.w,25)
    fill(0)
    text("Cartesian Coordinates",f.x+70,f.y-7.5)
    text("Polar",f.x-130,f.y-7.5)

    textSize(25)
    text("FREQUENCY DETECTION",f.x+35,f.y+f.h+155)
    textSize(15)

}

function reset(clear_freqs,auto_start,auto_poll){
    if (undefined == auto_poll || !auto_poll) {
        autopoll_flag = false;
        time_scalar_admin = 1;
    }
    time = 0;
    polar_tick = 0;
    comx = 0;
    comy = 0;
    cxy = 0;
    dxy2_calcs = []
    dxy_calcs = []
    dxy_calc_rev = 0
    running = auto_start;
    let msg = (running) ? "Pause" :"Play";
    play_button.html(msg);
    freq_data = (clear_freqs) ? [] : freq_data;

    background(180);

    generate_signal() 
    render_signal();

    render_frequency();

    draw_polar("reset")
    draw_polar("draw")

    draw_lines();

}

function slider_changed() {

    if (resolution != resolution_input.value()) {
        resolution = resolution_input.value();
        reset(false,running);
        resolution_label.html(resolution)
    }

    if (time_scalar != time_scalar_input.value()) {
        time_scalar = time_scalar_input.value();
        time_scalar_label.html(time_scalar+"x")
    }

    if (signal_period != signal_period_input.value()) {
        signal_period = signal_period_input.value()
        reset(true,running);
        signal_period_label.html(signal_period+" s")
    }

    if (circle_period != circle_period_input.value()) {
        circle_period = circle_period_input.value();
        reset(false,running);
        circle_period_label.html(circle_period+" s")
        circle_period_label_2.html(circle_period+" s")
    }
 
}

function draw() {
    translate(-width/2,-height/2);
    if (running) {

        tempTime = Date.now();
        if (handle_pause) {
            lastTime = tempTime - diffTime*(1000/(time_scalar*time_scalar_admin))
            handle_pause = false;
        }
        diffTime = time_scalar_admin*time_scalar * (tempTime - lastTime)/1000;
        if (time==0) {diffTime = 1.5/resolution}
        
        if (diffTime > 1/resolution) {
            time += diffTime;
            background(180);
            draw_polar("update")
            render_signal();
            draw_polar("draw")
            render_frequency();
            draw_lines();
            lastTime = tempTime;
        }


        if (autopoll_flag &&  floor(time / signal_period) > dxy_calc_rev) {
            
            flag2=10
            flag1=20
            dxy_calc_rev += 1;
            dxy_calcs.push(freq_data[circle_period]);

            if (dxy_calc_rev > 1) {
                dxy2_calcs.push(abs(dxy_calcs[dxy_calc_rev-1]-dxy_calcs[dxy_calc_rev-2]))
            }
            
            if (dxy_calc_rev > 2){
                flag2 = abs(dxy2_calcs[dxy_calc_rev-2]-dxy2_calcs[dxy_calc_rev-3])
                flag1 = dxy2_calcs[dxy_calc_rev-2]
            }

            //💀💀💀💀💀💀 💯💯💯💯
            
            if (flag1 < 0.01 && flag2 < 0.01) {
                if (circle_period >= 2) {
                    autopoll_flag = false;
                    time_scalar_admin = 1;
                } else {
                    circle_period += 0.05
                    circle_period = round(circle_period,2)
                    circle_period_input.value(circle_period);
                    circle_period_label.html(circle_period+" s")
                    circle_period_label_2.html(circle_period+" s")
                    reset(false,true,true)
                }
            }
        }
        //time
    }
    slider_changed();
}
