let height = 575;
let width = 600;

let A = {re:  0.5, im:  0.5};
let B = {re:  0.3, im:  0.2};
let C = {re: -0.1, im:  0.6};
let D = {re:  0.2, im: -0.5};

let translate_dict = {}
let drawing = []
let vector_moving = -1;
let redraw = false;
let clear_button;
let z_slider,d_slider;
let z_scale = 3
let d_scale = 20

function register_frame(label,x,y,w,h,vx,vy) {
    let cx = w/2 + x;
    let cy = h/2 + y;
    translate_dict[label] = {x:x,y:y,w:w,h:h,cx:cx,cy:cy,vx:vx,vy:vy}
}

function reset_frame(label) {

    let f = translate_dict[label];
    fill(200);
    strokeWeight(4);
    rect(f.x,f.y,f.w,f.h)

    strokeWeight(2);
    line(f.cx - f.w/2,f.cy,f.cx+f.w/2,f.cy);
    line(f.cx ,f.cy-f.h/2,f.cx,f.cy+f.h/2);

    strokeWeight(1);
    line(f.cx - f.w/2,f.cy-f.h/4,f.cx+f.w/2,f.cy-f.h/4);
    line(f.cx - f.w/2,f.cy+f.h/4,f.cx+f.w/2,f.cy+f.h/4);
    line(f.cx -f.w/4 ,f.cy-f.h/2,f.cx-f.w/4,f.cy+f.h/2);
    line(f.cx +f.w/4 ,f.cy-f.h/2,f.cx+f.w/4,f.cy+f.h/2);

}

function setup() {
    canvas = createCanvas(width, height);
    canvas.parent('p5-canvas');
    background(255);

    register_frame("graph",250,50,300,300,z_scale,z_scale);
    reset_frame("graph");

    register_frame("vector",50,400,150,150,1,1)
    reset_frame("vector");

    register_frame("drawing",400,400,150,150,z_scale,z_scale)
    reset_frame("drawing");

    let f = translate_dict["drawing"]
    clear_button = createButton("clear\ndrawing")
    clear_button.style("width","60px")
    clear_button.style("text-align","center")
    clear_button.parent('p5-canvas')
    clear_button.position(330,f.y+f.h-20-50);
    clear_button.mousePressed(() => {drawing = []; redraw = true;})

    z_slider = createSlider(1,20,z_scale,1)
    z_slider.parent('p5-canvas');
    z_slider.style('align-content','center')
    z_slider.style('width','120px')
    z_slider.style('height','10px')
    z_slider.position(440-170,560-40)

    d_slider = createSlider(10,50,d_scale,10)
    d_slider.parent('p5-canvas');
    d_slider.style('align-content','center')
    d_slider.style('width','120px')
    d_slider.style('height','10px')
    d_slider.position(440-170,575-40)

    draw_vectors();
    draw_graph();
    draw_labels();
    draw_drawing();
}

function draw() {
    if ((vector_moving != -1) || redraw || z_scale != z_slider.value() || d_scale != d_slider.value()){
        z_scale = z_slider.value()
        d_scale = d_slider.value()
        background(255);
        reset_frame("vector");
        reset_frame("graph");
        reset_frame("drawing");
        draw_drawing();
        draw_vectors();
        draw_graph();
        draw_labels();
        
    }
}

function draw_drawing(){
    let f = translate_dict["drawing"];
    let x,y;

    push();
    translate(f.cx,f.cy)

    strokeWeight(2)
    stroke(255)
    for (let x = -z_scale; x < z_scale; x += (z_scale*2)/d_scale) {
        for (let y = -z_scale; y < z_scale; y += (z_scale*2)/d_scale) {
            point(round(x,2)*(f.w/2)/z_scale,round(y,2)*(f.h/2)/z_scale);
        }
    }

    //Redraw border, often points clip over
    pop();
    noFill();
    stroke(0);
    strokeWeight(4);
    rect(f.x,f.y,f.w,f.h)
    strokeWeight(0);
    push();
    translate(f.cx,f.cy)
    
    beginShape(LINES)
    strokeWeight(2);
    stroke(0)
    for (i of drawing) {

        if (i.re=="break") {
            endShape();
            beginShape(LINES);
        }

        x = (f.w/2)*(i.re / z_scale);
        y = (f.h/2)*(i.im / z_scale);
        
        if (abs(x)<(f.w/2) && abs(y)<(f.h/2)){
            vertex(x,-y);
            console.log(i)
        }
    }
    endShape();

    redraw = false
    pop();
}

function draw_vectors(){

    let f = translate_dict["vector"];
    let scale = f.w/2*f.vx;
    let color;
    let i = 0;
    
    let vecs = [A,B,C,D]
    if (vector_moving !=-1) {
        vecs[vector_moving].re = map(mouseX - f.cx, -f.w/2,f.w/2,-f.vx,f.vx,true)
        vecs[vector_moving].im = map(mouseY - f.cy, -f.h/2,f.h/2, f.vy,-f.vy,true)
        vecs[vector_moving].re = round(vecs[vector_moving].re,2)
        vecs[vector_moving].im = round(vecs[vector_moving].im,2)
        
    }

    push();
    translate(f.cx,f.cy);
    strokeWeight(2);

    for (vec of vecs) {
        color = ['red','green','blue','black'][i];
        fill(color); stroke(color);
        line(0,0,vec.re*scale,-vec.im*scale);
        circle(vec.re*scale,-vec.im*scale, 10);
        i += 1;
    }

    A = vecs[0];
    B = vecs[1];
    C = vecs[2];
    D = vecs[3];
    pop();
}

function draw_graph() {

    

    let f = translate_dict["graph"];
    let w;
    let points = [];

    push();
    translate(f.cx,f.cy);

    stroke(0);
    strokeWeight(2);
    for (let x = -z_scale; x < z_scale; x += (z_scale*2)/d_scale) {
        for (let y = -z_scale; y < z_scale; y += (z_scale*2)/d_scale) {
            w = mobiusTransform(complex(round(x,2), round(y,2)));
            points.push(w);
        }
    }
    
    stroke(255)
    for (let i = 0; i < d_scale; i++) {
        for (let j = 0; j < d_scale; j++) {
            w = points[i*d_scale+j]
            w.re = w.re * f.w/(2*z_scale);
            w.im = w.im * f.h/(2*z_scale);
            if (abs(w.re) < f.w/2 && abs(w.im) < f.h/2) {
                point(w.re,w.im);
            }
        }
    }
    
  
    stroke(0);
    textSize(12)
    strokeWeight(2);
    for (let i = 0; i<drawing.length; i++) {
        p = drawing[i];
        if (p.re !="break"){
            w = mobiusTransform(p);
            w.re = w.re * f.w/(2*z_scale);
            w.im = w.im * f.h/(2*z_scale);
            if ((abs(w.re) < f.w/2 && abs(w.im) < f.h/2)) {
                point(w.re,w.im)
            }
        }
    }
    pop(); 
}

function draw_labels() {

    let label,msg,i,f;
    


    for (frame of ["graph","drawing","vector"]) {
        f = translate_dict[frame];
        fill('black')

        push();
        translate(f.cx,f.cy);
        textSize(15);

        textStyle(BOLD);
        text("I",-1,-f.h/2-10)
        text("R",f.w/2+10,5)

        textAlign(LEFT);
        textStyle(NORMAL);
        textSize(12);

        if (frame == "graph") {
            label = "( "+(z_scale).toFixed(1)+", "+(z_scale).toFixed(1) + " )";
        } else {
            label = "( "+(f.vx).toFixed(1)+", "+(f.vy).toFixed(1) + " )";
        }
        text(label, f.w/2-50,-f.h/2-10)
        line(f.w/2,-f.h/2,f.w/2,-f.h/2-5)

        if (frame != "graph") {
            textSize(15);
            textStyle(BOLD);
            
            textAlign(CENTER);
            label = (frame == "vector") ? "Coefficients" : "Drawing"
            if (label == "Drawing"){
                text("Scale:",-f.w+90-170,f.h/2+20-40)
                text("Density:",-f.w+83-170,f.h/2+35-40)
                text(label,-50,-f.h/2-10)
            } else {
                text(label,0,-f.h-60)
                text("Drag",-f.w/2 + 20,-f.h/2-10)
            }
        }

        pop();

    }
    
    i=0
    f = translate_dict["vector"];
    push();
    translate(f.cx,f.cy);
    textStyle(NORMAL);
    textAlign(LEFT);
    textSize(15);
    
    for (vec of [A,B,C,D]) {
        fill(['red','green','blue','black'][i]);
        text(["A:","B:","C:","D:"][i],f.x-40-70,-150+f.h/2*([-1/2,-1/4,0,1/4][i]))
        msg = (vec.re).toFixed(2)+ " + i * "+(vec.im).toFixed(2);
        text(msg,f.x-20-70,-150+f.h/2*([-1/2,-1/4,0,1/4][i]))
        i+=1;
    }

    text(msg,-f.w/2,50+f.h/2*([-1/2,-1/4,0,1/4][i]))
    pop();
    textStyle(BOLD);
    textAlign(LEFT);
    
    
    textSize(15);
    let sy = -20
    let sx = 65
    text( "f(z)  = ",sx+10,sy+205)
    strokeWeight(1);
    line(sx+60,sy+200,sx+120,sy+200)
    strokeWeight(0);
    text( "A * z + B \nC * z + D",sx+60,sy+195)

    textSize(25);
    textAlign(CENTER);
    text("Möbius \nTransform",65+sx,130+sy)
}

function mousePressed(e) {
    let f = translate_dict["vector"];
    let vx,vy,px,py;
    let d = []

    vx =   e.offsetX - f.cx
    vy = -(e.offsetY - f.cy)
    
    for (num of [A,B,C,D]) {
        px = map(num.re,-f.vx,f.vx,-f.w/2,f.w/2)
        py = map(num.im, -f.vy,f.vy,-f.h/2,f.h/2)
        d.push(pow(pow(vx-px,2)+pow(vy-py,2),0.5));
    }
    if (min(d) < 20) {
        vector_moving = d.indexOf(min(d));
    }
}

function mouseReleased(e) {
    vector_moving = -1;
    drawing.push({re:"break",im:0});
}

function mouseDragged() {
    let x,y;
    let f = translate_dict["drawing"];
    if (abs(mouseX - f.cx) < f.w/2 && abs(mouseY - f.cy) < f.h/2) {
        x = z_scale * (mouseX - f.cx)/(f.w/2);
        y = z_scale * -(mouseY - f.cy)/(f.h/2);
        drawing.push({re:x,im:y});
        redraw = true;
    }
}

function mobiusTransform(z) {
    let numerator = complex_add(complex_mult(z,A),B);
    let denominator = complex_add(complex_mult(z,C),D);
    let w = complex_mult(complex_inv(denominator),numerator)
    return w;
}

function complex(re, im) {
    return { re: re, im: im };
}

function complex_mult(z1,z2) {
    return {
        re: z1.re * z2.re - z1.im * z2.im,
        im: z1.re * z2.im + z1.im * z2.re
    }
}

function complex_inv(z) {
    let denom = z.re * z.re + z.im * z.im;
    return {
        re: z.re / denom,
        im: -z.im / denom
    }
}

function complex_add(z1,z2) {
    return {
        re: z1.re + z2.re,
        im: z1.im + z2.im
    }
}
