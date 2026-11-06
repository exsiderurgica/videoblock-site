#!/bin/bash
cd "$(dirname "$0")"
{ cat r1.html; echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script><script>'; cat tex.js r2.js r3.js r5.js r6.js r7.js r8.js r4.js; echo '</script>'; } > ../index.html
wc -c ../index.html
