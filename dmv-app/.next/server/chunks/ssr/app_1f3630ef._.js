module.exports = {

"[project]/app/favicon.ico (static in ecmascript)": (() => {{

throw new Error("An error occurred while generating the chunk item [project]/app/favicon.ico (static in ecmascript)\n\nCaused by:\n- StaticAsset::path: not found\n\nDebug info:\n- An error occurred while generating the chunk item [project]/app/favicon.ico (static in ecmascript)\n- Execution of <StaticUrlJsChunkItem as EcmascriptChunkItem>::content failed\n- Execution of <StaticOutputAsset as OutputAsset>::path failed\n- StaticAsset::path: not found");

}}),
"[project]/app/favicon.ico.mjs { IMAGE => \"[project]/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const e = new Error(`Could not parse module '[project]/app/favicon.ico.mjs'

Input image not found

Debug info:
- Execution of <StructuredImageFileSource as Asset>::content failed
- Execution of get_meta_data failed
- Input image not found`);
e.code = 'MODULE_UNPARSEABLE';
throw e;}}),

};