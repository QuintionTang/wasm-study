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

    // Get our exports object, with all of our exported Wasm Properties
    const exports = wasmModule.instance.exports;

    // Get our memory object from the exports
    const memory = exports.memory;

    // Create a Uint8Array to give us access to Wasm Memory
    const wasmByteMemoryArray = new Uint8Array(memory.buffer);

    // Get our canvas element from our index.html
    const canvasElement = document.querySelector("canvas");

    // Set up Context and ImageData on the canvas
    const canvasContext = canvasElement.getContext("2d");
    const canvasImageData = canvasContext.createImageData(
        canvasElement.width,
        canvasElement.height
    );

    // Clear the canvas
    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const getDarkValue = () => {
        return Math.floor(Math.random() * 100);
    };

    const getLightValue = () => {
        return Math.floor(Math.random() * 127) + 127;
    };

    const drawCheckerBoard = () => {
        const checkerBoardSize = 20;

        // Generate a new checkboard in wasm
        exports.generateCheckerBoard(
            getDarkValue(),
            getDarkValue(),
            getDarkValue(),
            getLightValue(),
            getLightValue(),
            getLightValue()
        );

        // Pull out the RGBA values from Wasm memory, the we wrote to in wasm,
        // starting at the checkerboard pointer (memory array index)
        const imageDataArray = wasmByteMemoryArray.slice(
            exports.CHECKERBOARD_BUFFER_POINTER.valueOf(),
            exports.CHECKERBOARD_BUFFER_SIZE.valueOf()
        );

        // Set the values to the canvas image data
        canvasImageData.data.set(imageDataArray);

        // Clear the canvas
        canvasContext.clearRect(
            0,
            0,
            canvasElement.width,
            canvasElement.height
        );

        // Place the new generated checkerboard onto the canvas
        canvasContext.putImageData(canvasImageData, 0, 0);
    };

    drawCheckerBoard();
    setInterval(() => {
        drawCheckerBoard();
    }, 1000);
};
runWasm();
