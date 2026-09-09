# a video editor

### important commands:

do npm run dev -- --host 0.0.0.0 in cmd

to run as an actual app/window: do: npm install --save-dev electron

then do npx electron main.cjs in cmd

you also need webcodecs so do npm install -D @types/dom-webcodecs



# **IMPORTANT**

if you're using shaders

the editor won't work if base\_window\_transparency is less than 0.004 in config.json

when coding a shader, make sure to swap the blue and red channels in the output color. this is cuz webgl uses bgra and glsl uses rgba.

overlay.tsx uses



downscale\_factor won't downscale if enshittify is disabled

enabling enshittify makes the whole image look shit

even with no downscale

