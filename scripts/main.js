const wasmBrowserInstantiate = async (wasmModuleUrl, importObject) => {
    let response = undefined;

    if (!importObject) {
        importObject = {
            env: {
                abort: () => console.log("Abort!"),
            },
        };
    }

    // 检查浏览器是否支持流实例化
    if (WebAssembly.instantiateStreaming) {
        // 获取模块，并在下载时实例化它
        response = await WebAssembly.instantiateStreaming(
            fetch(wasmModuleUrl),
            importObject
        );
    } else {
        const fetchAndInstantiateTask = async () => {
            const wasmArrayBuffer = await fetch(wasmModuleUrl).then(
                (response) => response.arrayBuffer()
            );
            return WebAssembly.instantiate(wasmArrayBuffer, importObject);
        };
        response = await fetchAndInstantiateTask();
    }

    return response;
};

const runWasm = async () => {
    // Instantiate our wasm module
    const wasmModule = await wasmBrowserInstantiate("./build/core.wasm");
    const { init, getNextPosition, move } = wasmModule.instance.exports;

    const CANVAS_LOCATION_X = 150;
    const ROD_LOCATION_X = 200;
    const ROD_LOCATION_Y = 135;
    const BALL_LOCATION_Y = 150;
    const PENDULUM_VELOCITY = 0;
    const SPEED = 50;
    const AMPLITUDE = 20;

    const canvas = document.getElementById("pendulum");
    const context = canvas.getContext("2d");
    const boundingRect = canvas.getBoundingClientRect();

    // Compute the size of the viewport
    const ratio = window.devicePixelRatio || 1;
    const width = (boundingRect.width | 0) * ratio;
    const height = (boundingRect.height | 0) * ratio;
    canvas.width = width;
    canvas.height = height;
    context.scale(ratio, ratio);

    const clearCanvas = (context, canvas) => {
        context.clearRect(0, 0, canvas.width, canvas.height);
    };
    const drawBall = (context, x, y) => {
        context.arc(x, y, 20, 0, 2 * Math.PI, false);

        const startCircle = {
            x,
            y,
            r: 2,
        };

        const endCircle = {
            x,
            y,
            r: 18,
        };

        const circleGradient = context.createRadialGradient(
            startCircle.x,
            startCircle.y,
            startCircle.r,
            endCircle.x,
            endCircle.y,
            endCircle.r
        );

        circleGradient.addColorStop(0, "#fff");
        circleGradient.addColorStop(1, "#fa310a");

        return circleGradient;
    };
    const drawRod = (context, x, y) => {
        context.moveTo(CANVAS_LOCATION_X, 0);
        context.lineTo(x, y);
        context.lineWidth = 1;
        context.setLineDash([1, 1]);
        context.strokeStyle = "grey";
        context.stroke();
    };

    context.beginPath();
    init(CANVAS_LOCATION_X, AMPLITUDE, width, height);
    drawRod(context, ROD_LOCATION_X, ROD_LOCATION_Y);
    context.beginPath();
    const pendulumCircle = drawBall(context, ROD_LOCATION_X, BALL_LOCATION_Y);
    context.fillStyle = pendulumCircle;
    context.fill();
    context.beginPath();

    function drawPendulum() {
        clearCanvas(context, canvas);
        context.beginPath();
        move();
        drawRod(context, getNextPosition(), ROD_LOCATION_Y);
        context.beginPath();
        const grd = drawBall(context, getNextPosition(), BALL_LOCATION_Y);
        context.fillStyle = grd;
        context.fill();
    }
    window.setInterval(drawPendulum, SPEED);
};
runWasm();
