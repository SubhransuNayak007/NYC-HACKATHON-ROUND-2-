// ============================================
// CUSTOM GLSL SHADERS
// ============================================

// Displacement shader - creates organic distortion
export const displacementShader = {
  vertex: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform float uProgress;
    uniform vec2 uMouse;
    uniform float uIntensity;
    uniform sampler2D uTexture;
    varying vec2 vUv;

    // Simplex 2D noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g = vec3(a0.x * x0.x + h.x * x0.y, a0.y * x12.x + h.y * x12.y, a0.z * x12.z + h.z * x12.w);
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = vUv;

      // Scroll-based displacement
      float dispX = snoise(uv * 10.0 + uTime * 0.1) * uProgress * uIntensity * 0.02;
      float dispY = snoise(uv * 10.0 + uTime * 0.1 + 100.0) * uProgress * uIntensity * 0.02;

      // Mouse-based distortion
      vec2 mouseDist = uv - uMouse;
      float mouseInfluence = 1.0 - smoothstep(0.0, 0.3, length(mouseDist));
      dispX += mouseDist.x * mouseInfluence * uIntensity * 0.05;
      dispY += mouseDist.y * mouseInfluence * uIntensity * 0.05;

      uv += vec2(dispX, dispY);

      vec4 color = texture2D(uTexture, uv);
      gl_FragColor = color;
    }
  `,
};

// Flow field shader - particle-like motion
export const flowFieldShader = {
  vertex: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform float uProgress;
    uniform vec2 uMouse;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    vec2 flowField(vec2 p, float t) {
      float n = fbm(p * 3.0 + t * 0.1);
      float angle = n * 6.28318;
      return vec2(cos(angle), sin(angle));
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5);

      // Flow field distortion
      vec2 flow = flowField(uv * 5.0, uTime) * 0.02 * uProgress;
      uv += flow;

      // Mouse interaction
      vec2 mouseVec = uv - uMouse;
      float mouseDist = length(mouseVec);
      if (mouseDist < 0.15) {
        uv += normalize(mouseVec) * (0.15 - mouseDist) * 0.5;
      }

      // Color based on flow
      float n = fbm(uv * 10.0 + uTime * 0.5);
      vec3 color = mix(uColorA, uColorB, n);

      // Add glow at center
      float dist = length(uv - center);
      float glow = smoothstep(0.5, 0.0, dist) * uProgress;
      color += vec3(glow) * uColorA * 0.5;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// SDF (Signed Distance Field) shader - crisp shapes
export const sdfShader = {
  vertex: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform float uProgress;
    uniform vec2 uMouse;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying vec2 vUv;

    // SDF Circle
    float sdCircle(vec2 p, float r) { return length(p) - r; }

    // SDF Rounded Rectangle
    float sdRoundedRect(vec2 p, vec2 b, float r) {
      return length(max(abs(p) - b + r, 0.0)) - r;
    }

    // SDF Polygon
    float sdPolygon(vec2 p, int n, float r) {
      float angle = 6.28318 / float(n);
      float a = atan(p.y, p.x) + angle * 0.5;
      float r2 = cos(floor(0.5 + a / angle) * angle) * length(p);
      return r2 - r;
    }

    // Smooth minimum
    float smin(float a, float b, float k) {
      float h = max(k - abs(a - b), 0.0) / k;
      return min(a, b) - h * h * h * k / 6.0;
    }

    void main() {
      vec2 uv = (vUv - 0.5) * 2.0;
      uv.x *= 1.777; // Aspect ratio correction

      // Animated shapes
      float t = uTime * 0.5;

      // Multiple shapes with smooth blending
      float d1 = sdCircle(uv - vec2(sin(t) * 0.5, cos(t * 0.7) * 0.3), 0.25);
      float d2 = sdRoundedRect(uv - vec2(cos(t * 1.3) * 0.4, sin(t) * 0.4), vec2(0.3), 0.08);
      float d3 = sdPolygon(uv - vec2(0.0, sin(t * 0.5) * 0.3), 5, 0.2);

      float d = smin(smin(d1, d2, 0.1), d3, 0.1);

      // Mouse repulsion
      vec2 mousePos = (uMouse - 0.5) * 2.0;
      mousePos.x *= 1.777;
      float mouseDist = length(uv - mousePos);
      if (mouseDist < 0.3) {
        d += (0.3 - mouseDist) * 2.0;
      }

      // Progress-based reveal
      d -= uProgress * 1.0;

      // Color with smooth edges
      float edge = smoothstep(-0.02, 0.02, d);
      vec3 color = mix(uColorB, uColorA, edge);

      // Glow
      float glow = exp(-abs(d) * 20.0) * uProgress;
      color += vec3(glow) * uColorA * 0.3;

      gl_FragColor = vec4(color, edge);
    }
  `,
};

// Fluid simulation shader (simplified Navier-Stokes)
export const fluidShader = {
  vertex: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform float uProgress;
    uniform vec2 uMouse;
    uniform sampler2D uVelocity;
    uniform sampler2D uPressure;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      // Simple fluid-like pattern
      vec2 p = uv * 20.0;
      float t = uTime * 0.5;

      // Curl noise for fluid motion
      float n1 = sin(p.x + t) * cos(p.y + t * 0.7);
      float n2 = sin(p.y - t * 1.3) * cos(p.x - t);
      float n3 = sin((p.x + p.y) * 0.5 + t * 0.3);

      float fluid = (n1 + n2 + n3) / 3.0;

      // Mouse disturbance
      vec2 mousePos = uMouse * 20.0;
      float mouseDist = length(p - mousePos);
      if (mouseDist < 5.0) {
        fluid += (5.0 - mouseDist) / 5.0 * 2.0;
      }

      // Progress control
      fluid *= uProgress;

      // Color mapping
      vec3 color = mix(
        vec3(0.05, 0.1, 0.2),
        vec3(0.6, 0.8, 1.0),
        fluid * 0.5 + 0.5
      );

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// Post-processing shaders
export const postProcessingShaders = {
  // Chromatic Aberration
  chromaticAberration: {
    vertex: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragment: `
      uniform sampler2D tDiffuse;
      uniform float uAmount;
      uniform vec2 uResolution;
      varying vec2 vUv;

      void main() {
        vec2 offset = uAmount / uResolution;
        float r = texture2D(tDiffuse, vUv + offset).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv - offset).b;
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `,
  },

  // Film Grain
  filmGrain: {
    vertex: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragment: `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;

      float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        float noise = rand(vUv * 100.0 + uTime) - 0.5;
        color.rgb += noise * uIntensity;
        gl_FragColor = color;
      }
    `,
  },

  // Vignette
  vignette: {
    vertex: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragment: `
      uniform sampler2D tDiffuse;
      uniform float uAmount;
      uniform float uSmoothness;
      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0;
        float vignette = smoothstep(1.0 - uSmoothness, 1.0, dist) * uAmount;
        color.rgb *= 1.0 - vignette;
        gl_FragColor = color;
      }
    `,
  },
};

// Shader uniforms type
export type ShaderUniforms = {
  uTime: { value: number };
  uProgress: { value: number };
  uMouse: { value: { x: number; y: number } };
  uIntensity: { value: number };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uTexture: { value: THREE.Texture | null };
  uResolution: { value: THREE.Vector2 };
  uAmount: { value: number };
  uSmoothness: { value: number };
};

// Import THREE for types
import * as THREE from 'three';

// Export all shaders
export const shaders = {
  displacement: displacementShader,
  flowField: flowFieldShader,
  sdf: sdfShader,
  fluid: fluidShader,
  ...postProcessingShaders,
};

export default shaders;