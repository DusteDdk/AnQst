// AnQst generated should expect a method main to exist, then call main with window, document and AnQstGenerated, when the document is ready.
async function main(window, document, AnQstGenerated) {
    const {MagicTickerService, Magic} = await AnQstGenerated.VanillaJsWidget.createFrontend();

    const tickDisplayElement = document.getElementById('tickDisplay');
    const valueDisplayElement = document.getElementById('valueDisplay');

    function updateMagic() {
        // Update tick
        tick = tick + 1;
        // Create "magic" number
        const value = Math.round( Math.random()*1e6 );
        // Emit signal
        MagicTickerService.spreadMagic( new Magic(tick, value));

        // Show value
        tickDisplayElement.innerHTML = tick;
        valueDisplayElement.innerHTML = value;
    }

    let interval=undefined;
    let tick;

    function resetMagic() {
        tick=-1;
        if(interval) {
            clearInterval(interval);
        }
        interval = setInterval( updateMagic, 1000 );
    }

    resetMagic();



    // Reset when that slot is called
    MagicTickerService.onSlot.reset(resetMagic);
}