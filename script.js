/*

wgld.org をやっていくなかで発生した疑問点．後で調べる
- varying の仕組み
    - なんか，同じ名前だけど中身は別物っていう記述があった．じゃあどうやって紐づけてるの？名前？
- そもそも，WebGL さんの中身，shader の中身，結構やってくれてる感あるよね．
    - 例えば，vertex と flagment の紐づけとか，program って何なのよ．
- 浮動小数の精度がどのぐらい影響するのか
- ライティング: 逆行列を掛ける理由
- 何故，奥行き情報も初期化しないといけないのか

*/


// 外部 glsl ファイルを読み込む
// vert と flag は別々
function loadResources(urls) {
    let promises = urls.map(function(url) {
        return new Promise(function(resolve, reject) {
            let request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = "text";
            request.onload = function() {
                if (request.readyState === 4 || request.status === 200) {
                    resolve(request.responseText);
                } else {
                    reject(new Error(request.statusText));
                }
            }
            request.send(null);
        });
    });

    return promises;
}

async function parseResource(urls) {
    let promises = await loadResources(urls);
    return Promise.all(promises).then(function(values) {
        return values.join("\n");
    });
}

onload = async function() {

    // glsl 読み込み
    document.getElementById("vs").textContent = await parseResource(["main.vert"]); // vertex shader 
    document.getElementById("fs").textContent = await parseResource(["main.flag"]); // flag shader
    // 読み込みが終わってから処理を記述 

    let c = document.getElementById("canvas");
    c.width = 500;
    c.height = 300;

    let gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // canvas の初期化をする際の深度を設定する
    gl.clearDepth(1.0);

    // canvas を初期化
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
    let v_shader = create_shader("vs");
    let f_shader = create_shader("fs");

    let prg = create_program(v_shader, f_shader);

    let attLocations = new Array();
    attLocations[0] = gl.getAttribLocation(prg, "position");
    attLocations[1] = gl.getAttribLocation(prg, "color");
    attLocations[2] = gl.getAttribLocation(prg, "textureCoord");

    let attStrides = new Array();
    attStrides[0] = 3;
    attStrides[1] = 4;
    attStrides[2] = 2;

    /*
    let torusData = torus(64, 64, 1.0, 3.0, [0.75, 0.25, 0.25, 1.0]);
    let tPosition = create_vbo(torusData.p);
    let tNormal = create_vbo(torusData.n);
    let tColor = create_vbo(torusData.c);
    let tIndex = create_ibo(torusData.i);

    let tVBOList  = [tPosition, tNormal, tColor];

    let sphereData = sphere(64, 64, 2.0, [0.25, 0.25, 0.75, 1.0]);
    let sPosition = create_vbo(sphereData.p);
    let sNormal   = create_vbo(sphereData.n);
    let sColor    = create_vbo(sphereData.c);
    let sIndex    = create_ibo(sphereData.i);

    let sVBOList  = [sPosition, sNormal, sColor];
    */

    let  position = [
        -1.0, 1.0, 0.0,
        1.0,  1.0, 0.0,
        -1.0,-1.0, 0.0,
        1.0, -1.0, 0.0
    ];

    let color = [
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0
    ];

    let textureCoord = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0
    ];

    let index = [
        0, 1, 2,
        3, 2, 1
    ];

    let vPosition       = create_vbo(position);
    let vColor          = create_vbo(color);
    let vTextureCoord   = create_vbo(textureCoord);
    let VBOList         = [vPosition, vColor, vTextureCoord];
    let iIndex          = create_ibo(index);

    set_attribute(VBOList, attLocations, attStrides);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndex);

    
    let uniLocations = new Array();
    uniLocations[0] = gl.getUniformLocation(prg, "mvpMatrix");
    uniLocations[1] = gl.getUniformLocation(prg, "texture");
    /*
    uniLocations[1] = gl.getUniformLocation(prg, "mMatrix");
    uniLocations[2] = gl.getUniformLocation(prg, "invMatrix");
    uniLocations[3] = gl.getUniformLocation(prg, "lightPosition");
    uniLocations[4] = gl.getUniformLocation(prg, "eyeDirection");
    uniLocations[5] = gl.getUniformLocation(prg, "ambientColor");
    */
    

    let m = new matIV();
    
    let mMatrix = m.identity(m.create());
    let vMatrix = m.identity(m.create());
    let pMatrix = m.identity(m.create());
    let tmpMatrix = m.identity(m.create());
    let mvpMatrix = m.identity(m.create());
    let invMatrix = m.identity(m.create());

    m.lookAt([0.0, 2.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    /*
    let lightPosition = [0.0, 0.0, 0.0];
    let ambientColor = [0.1, 0.1, 0.1, 1.0];
    let eyeDirection = [0.0, 0.0, 20.0];
    */

    /*
    gl.enable(gl.CULL_FACE);
    */
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
 
    
    let texture = null;
    create_texture("texture.png");
    gl.activeTexture(gl.TEXTURE0);
    
    let count = 0;

    (function() {

       
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        count++;

        let rad = (count % 360) * Math.PI / 180;
        let tx  = Math.cos(rad) * 3.5;
        let ty  = Math.sin(rad) * 3.5;
        let tz  = Math.sin(rad) * 3.5;

        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.uniform1i(uniLocations[1], 0);

        m.identity(mMatrix);
        m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);

        m.inverse(mMatrix, invMatrix);

        gl.uniformMatrix4fv(uniLocations[0], false, mvpMatrix);
        gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

        // redraw
        gl.flush();

        setTimeout(arguments.callee, 1000/100);
    })();

    function set_attribute(vbos, attL, attS) {
        for (let i = 0; i < vbos.length; i++) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vbos[i]);
            gl.enableVertexAttribArray(attL[i]);
            gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }
    }

    function create_program(vs, fs) {
        let program = gl.createProgram();

        gl.attachShader(program, vs);
        gl.attachShader(program, fs);

        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);

            return program;
        } else {
            alert(gl.getProgramInfoLog(program));
        }
    }

    function create_shader(id) {
        let shader;

        let scriptElement = document.getElementById(id);

        if (!scriptElement) { return; }

        switch (scriptElement.type) {
            case "x-shader/x-vertex" :
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;
            case "x-shader/x-fragment" :
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default :
                return ;
        }

        gl.shaderSource(shader, scriptElement.text);

        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        } else {
            alert(gl.getShaderInfoLog(shader));
        }
    }

    function create_vbo(data) {
        let vbo = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        return vbo;
    }

    function create_ibo(data) {
        let ibo = gl.createBuffer();

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        
        return ibo;
    }


    function create_texture(source) {
        let img = new Image();

        img.onload = function() {
            // テクスチャオブジェクトの生成
            let tex = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, tex);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

            gl.generateMipmap(gl.TEXTURE_2D);

            gl.bindTexture(gl.TEXTURE_2D, null);

            texture = tex;
        };

        img.src = source;
    }

    // advance
    function hsva(h, s, v, a) {
        if (s > 1 || v > 1 || a > 1) { return; }
        let th = h % 360;
        let i = Math.floor(th / 60);
        let f = th / 60 - i;
        let m = v * (1 - s);
        let n = v * (1 - s * f);
        let k = v * (1 - s * (1 - f));
        let color = new Array();
        if (!s > 0 && !s < 0) {
            color.push(v. v, v, a);
        } else {
            let r = new Array(v, n, m, m, k, v);
            let g = new Array(k, v, v, n, m, m);
            let b = new Array(m, m, k, v, v, n);
            color.push(r[i], g[i], b[i], a);
        }

        return color;
    }

    function sphere(row, column, rad, color) {
        let pos = new Array(), nor = new Array(),
            col = new Array(), idx = new Array();

        for (let i = 0; i <= row; i++) {
            let r = Math.PI / row * i;
            let ry = Math.cos(r);
            let rr = Math.sin(r);

            for (let j = 0; j <= column; j++) {
                let tr = Math.PI * 2 / column * j;
                let tx = rr * rad * Math.cos(tr);
                let ty = ry * rad;
                let tz = rr * rad * Math.sin(tr);
                let rx = rr * Math.cos(tr);
                let rz = rr * Math.sin(tr);

                let tc;
                if (color) {
                    tc = color;
                } else {
                    tc = hsva(360 / row * i, 1, 1, 1);
                }
                pos.push(tx, ty, tz);
                nor.push(rx, ry, rz);
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }

        r = 0;
        for (let i = 0; i < row; i++) {
            for (let j = 0; j < column; j++) {
                r = (column + 1) * i + j;
                idx.push(r, r + 1, r + column + 2);
                idx.push(r, r + column + 2, r + column + 1);
            }
        }
        return {p: pos, n: nor, c: col, i: idx};
    }
    
    function torus(row, column, irad, orad, color) {
        let pos = new Array(), col = new Array(), idx = new Array(), nor = new Array();

        for (let i = 0; i <= row; i++) {
            let r = Math.PI * 2 / row * i;
            let rr = Math.cos(r);
            let ry = Math.sin(r);

            for (let ii = 0; ii <= column; ii++) {
                let tr = Math.PI * 2 / column * ii;
                let tx = (rr * irad + orad) * Math.cos(tr);
                let ty = ry * irad;
                let tz = (rr * irad + orad) * Math.sin(tr);
                let rx = rr * Math.cos(tr);
                let rz = rr * Math.sin(tr);
                nor.push(rx, ry, rz);
                pos.push(tx, ty, tz);
                let tc;
                if (color) {
                    tc = color;
                } else {
                    tc = hsva(360 / column * ii, 1, 1, 1);
                }
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }

        for (let i = 0; i < row; i++) {
            for (let ii = 0; ii < column; ii++) {
                r = (column + 1) * i + ii;
                idx.push(r, r + column + 1, r + 1);
                idx.push(r + column + 1, r + column + 2, r + 1);
            }
        }

        return {p: pos, n : nor, c : col, i : idx};
    }
};

