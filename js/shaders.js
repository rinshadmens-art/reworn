export const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  uniform sampler2D uTexCurrent;
  uniform sampler2D uTexNext;
  uniform float uProgress;
  uniform vec2 uResolution;
  uniform vec2 uImageRes;
  uniform float uWaveFreq;
  uniform float uWavePow;
  uniform float uWaveWidth;
  uniform float uFalloff;
  uniform float uBoostStrength;
  uniform float uCrossfadeWidth;
  uniform float uMobile;

  varying vec2 vUv;

  vec2 getImageUv(vec2 uv, vec2 screenRes, vec2 imgRes, vec2 boxMin, vec2 boxMax) {
    vec2 boxUv = (uv - boxMin) / (boxMax - boxMin);

    vec2 boxSize = (boxMax - boxMin) * screenRes;
    float boxAspect = boxSize.x / boxSize.y;
    float imgAspect = imgRes.x / imgRes.y;

    /* CONTAIN, not cover. The reference filled its box with a landscape
       photograph; the slides are cut-out garments now, and covering the
       box cropped the collar off the top and the hem off the bottom.
       Swapping which axis is scaled letterboxes instead of cropping. */
    vec2 scale = vec2(1.0);
    if (boxAspect > imgAspect) {
      scale.x = boxAspect / imgAspect;
    } else {
      scale.y = imgAspect / boxAspect;
    }

    return (boxUv - 0.5) * scale + 0.5;
  }

  /* Containing samples outside 0..1, where ClampToEdge would smear the
     edge pixels into streaks. Zero there instead. */
  float inImage(vec2 uv){
    vec2 s = step(vec2(0.0), uv) * step(uv, vec2(1.0));
    return s.x * s.y;
  }

  bool isInsideBox(vec2 uv, vec2 boxMin, vec2 boxMax) {
    return uv.x >= boxMin.x && uv.x <= boxMax.x && uv.y >= boxMin.y && uv.y <= boxMax.y;
  }

  void main() {
    vec2 boxMin = mix(vec2(0.25, 0.175), vec2(0.0), uMobile);
    vec2 boxMax = mix(vec2(0.75, 0.825), vec2(1.0), uMobile);

    float aspectRatio = uResolution.y / uResolution.x;

    vec2 coord = vec2(vUv.x, vUv.y * aspectRatio);
    vec2 center = vec2(0.5, 0.5 * aspectRatio);

    float dist = distance(coord, center);
    float time = uProgress;

    vec2 displaced = coord;
    float brightness = 0.0;
    float blend = 0.0;

    if (time > 0.001) {
      float trailing = dist - time;

      if (trailing < uWaveWidth && trailing < 0.0) {
        float age = -trailing;
        float decay = exp(-age * uFalloff);
        float wave = sin(age * uWaveFreq) * decay;

        vec2 direction = normalize(coord - center);
        displaced += direction * wave * uWavePow;

        brightness = abs(wave) * uBoostStrength * decay;
      }

      blend = smoothstep(0.0, uCrossfadeWidth, -trailing);
    }

    vec2 finalUv = vec2(displaced.x, displaced.y / aspectRatio);
    vec2 imageUv = getImageUv(finalUv, uResolution, uImageRes, boxMin, boxMax);

    float inside = inImage(imageUv);
    vec4 currentColor = texture2D(uTexCurrent, imageUv);
    vec4 nextColor = texture2D(uTexNext, imageUv);
    currentColor.a *= inside;
    nextColor.a *= inside;

    vec4 color = mix(currentColor, nextColor, blend);
    color.rgb += color.rgb * brightness;

    if (!isInsideBox(finalUv, boxMin, boxMax)) {
      color = vec4(0.0);
    }

    gl_FragColor = color;
  }
`;
