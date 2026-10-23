# Vite + TypeScript + plain Three.js, static site, one scene per module

No UI framework and no backend: the site is static and deployable anywhere. Future chemistry and physics modules plug in as separate scenes under the same shell. Chosen over react-three-fiber to keep dependencies small and the render loop explicit; the DOM UI is plain TypeScript. Reversing this later means rewriting the UI layer.
