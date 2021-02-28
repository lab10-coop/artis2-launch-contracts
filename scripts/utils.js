// Provide arguments to the script through ":" separator
function parseColonArgs(argv) {
    const argIndex = argv.indexOf(":");
    if (argIndex < 0) {
        throw new Error("No colon arguments provided");
    }
    const args = argv.slice(argIndex + 1);
    //console.log("Colon arguments", args);
    return args;
}

module.exports = {
    parseColonArgs
};
