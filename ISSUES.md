# Director Skill Rework - Issues Register

## Open Issues

1. **[Testing]** Need to implement automated testing for ComfyUI integration (Basic ping script created, full workflow test pending).

## Resolved Issues

1. **[Chat]** Chat API endpoint returns HTML instead of JSON: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
   *Cause:* The UI frontend was interacting with the *old* background instance of `server.js` which didn't have the new endpoints, returning a 404 HTML error page that crashed the JSON parser.
   *Fix:* Restarted the `server.js` node process.
2. **[Data]** Existing projects show no content in the UI despite having existing `shot_list.json` data.
   *Cause:* The same missing `/config` route on the old server caused the entire project loading sequence to crash.
   *Fix:* Restarted the server.