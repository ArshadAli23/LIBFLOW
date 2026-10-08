import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, Eye, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export interface Hero3DCanvasProps {
  className?: string;
  fallbackTitle?: string;
  interactive?: boolean;
}

const checkWebGLSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

const checkReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Hero3DCanvas (Phase 3 Core 3D Experience)
 * Production Three.js 3D Book Ecosystem:
 * - Floating Hardcover Tome with layered paper block and ribbon bookmark
 * - Supporting horizontal pedestal book stacks
 * - Responsive ResizeObserver and devicePixelRatio clamping
 * - Smooth mouse parallax with exponential easing (lerp)
 * - Light / Dark mode dynamic illumination matching design tokens
 * - Strict WebGL safety fallback and prefers-reduced-motion adherence
 */
export const Hero3DCanvas: React.FC<Hero3DCanvasProps> = ({
  className,
  fallbackTitle = 'Smart Bibliographic Circulation Engine',
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGL] = useState<boolean>(checkWebGLSupport);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(checkReducedMotion);
  const [renderError, setRenderError] = useState<boolean>(false);
  const { theme } = useTheme();

  // Listen to prefers-reduced-motion changes
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    motionQuery.addEventListener('change', handleMotionChange);
    return () => motionQuery.removeEventListener('change', handleMotionChange);
  }, []);

  // Three.js Scene Setup & Lifecycle
  useEffect(() => {
    if (!hasWebGL || renderError || !containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    let animationFrameId: number;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let rootGroup: THREE.Group;
    let mainBookGroup: THREE.Group;
    let stackGroup: THREE.Group;
    let ambientLight: THREE.AmbientLight;
    let dirLight1: THREE.DirectionalLight;
    let dirLight2: THREE.DirectionalLight;
    let pointLight: THREE.PointLight;

    // Mouse coordinates for parallax
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    try {
      scene = new THREE.Scene();

      // Camera
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 400;
      camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 0.4, 4.6);

      // WebGL Renderer
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      // Master Root Group
      rootGroup = new THREE.Group();
      scene.add(rootGroup);

      // --- MATERIALS HELPER ---
      const createBookCoverMaterial = (color: number, roughness = 0.35, metalness = 0.15) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness,
          metalness,
        });

      const paperMaterial = new THREE.MeshStandardMaterial({
        color: isDark ? 0xe2e0d8 : 0xfcfbfa,
        roughness: 0.8,
        metalness: 0.05,
      });

      const ribbonMaterial = new THREE.MeshStandardMaterial({
        color: isDark ? 0x3b82f6 : 0x2563eb,
        roughness: 0.4,
        metalness: 0.3,
      });

      const edgeGlowMaterial = new THREE.MeshStandardMaterial({
        color: isDark ? 0x60a5fa : 0x0f172a,
        roughness: 0.2,
        metalness: 0.4,
      });

      // --- FUNCTION TO CREATE A DETAILED 3D BOOK ---
      const createBook = (
        bookWidth: number,
        bookHeight: number,
        bookThickness: number,
        coverColor: number,
        hasRibbon = false
      ) => {
        const book = new THREE.Group();
        const coverMargin = 0.03;
        const coverThickness = 0.02;

        const coverMat = createBookCoverMaterial(coverColor);

        // Front Cover
        const frontGeo = new THREE.BoxGeometry(bookWidth + coverMargin, bookHeight + coverMargin, coverThickness);
        const frontMesh = new THREE.Mesh(frontGeo, coverMat);
        frontMesh.position.z = bookThickness / 2 + coverThickness / 2;
        book.add(frontMesh);

        // Back Cover
        const backGeo = new THREE.BoxGeometry(bookWidth + coverMargin, bookHeight + coverMargin, coverThickness);
        const backMesh = new THREE.Mesh(backGeo, coverMat);
        backMesh.position.z = -(bookThickness / 2 + coverThickness / 2);
        book.add(backMesh);

        // Spine
        const spineGeo = new THREE.BoxGeometry(coverThickness, bookHeight + coverMargin, bookThickness + coverThickness * 2);
        const spineMesh = new THREE.Mesh(spineGeo, coverMat);
        spineMesh.position.x = -(bookWidth / 2 + coverMargin / 2);
        book.add(spineMesh);

        // Paper Page Block
        const pagesGeo = new THREE.BoxGeometry(bookWidth - 0.02, bookHeight - 0.04, bookThickness);
        const pagesMesh = new THREE.Mesh(pagesGeo, paperMaterial);
        pagesMesh.position.x = 0.02;
        book.add(pagesMesh);

        // Decorative Spine Ribs / Foil Lines
        const foilGeo = new THREE.BoxGeometry(coverThickness * 1.2, 0.02, bookThickness + coverThickness * 2.1);
        const foilMat = edgeGlowMaterial;
        const rib1 = new THREE.Mesh(foilGeo, foilMat);
        rib1.position.set(-(bookWidth / 2 + coverMargin / 2), 0.3, 0);
        const rib2 = new THREE.Mesh(foilGeo, foilMat);
        rib2.position.set(-(bookWidth / 2 + coverMargin / 2), -0.3, 0);
        book.add(rib1, rib2);

        // Bookmark Ribbon
        if (hasRibbon) {
          const ribbonGeo = new THREE.BoxGeometry(0.06, bookHeight * 0.7, 0.005);
          const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMaterial);
          ribbonMesh.position.set(0.1, -bookHeight / 2 - 0.15, bookThickness / 2 + 0.02);
          ribbonMesh.rotation.z = 0.15;
          book.add(ribbonMesh);
        }

        return book;
      };

      // 1. Central Hero Tome (Floating, Tilted)
      mainBookGroup = new THREE.Group();
      const mainCoverColor = isDark ? 0x1e293b : 0x0f172a;
      const mainBook = createBook(1.25, 1.75, 0.28, mainCoverColor, true);
      mainBookGroup.add(mainBook);

      // Hero Tome Position & Initial Rotation
      mainBookGroup.position.set(-0.15, 0.25, 0.4);
      mainBookGroup.rotation.set(0.3, -0.45, 0.15);
      rootGroup.add(mainBookGroup);

      // 2. Pedestal Stacks (Horizontal Foundation Books)
      stackGroup = new THREE.Group();
      stackGroup.position.set(0.4, -0.9, -0.3);

      const stackColors = isDark
        ? [0x334155, 0x1e293b, 0x0f172a]
        : [0xdad7cd, 0x334155, 0x1e293b];

      stackColors.forEach((color, idx) => {
        const stackBook = createBook(1.35, 1.85, 0.22, color, false);
        stackBook.rotation.set(-Math.PI / 2, 0, (idx * 0.14) - 0.1);
        stackBook.position.set(0, idx * 0.25, 0);
        stackGroup.add(stackBook);
      });
      rootGroup.add(stackGroup);

      // 3. Floating Satellite Tome (Upper Right floating companion)
      const satelliteColor = isDark ? 0x2563eb : 0x1e3a8a;
      const satelliteBook = createBook(0.7, 1.05, 0.14, satelliteColor, false);
      satelliteBook.position.set(1.5, 0.9, -0.6);
      satelliteBook.rotation.set(-0.25, 0.6, -0.2);
      rootGroup.add(satelliteBook);

      // --- LIGHTING ---
      ambientLight = new THREE.AmbientLight(
        isDark ? 0x8892b0 : 0xf8f9fa,
        isDark ? 1.4 : 1.8
      );
      scene.add(ambientLight);

      dirLight1 = new THREE.DirectionalLight(
        isDark ? 0x93c5fd : 0xffffff,
        isDark ? 2.2 : 2.6
      );
      dirLight1.position.set(4, 6, 5);
      scene.add(dirLight1);

      dirLight2 = new THREE.DirectionalLight(
        isDark ? 0x3b82f6 : 0xe2e8f0,
        isDark ? 1.5 : 1.2
      );
      dirLight2.position.set(-4, -2, 3);
      scene.add(dirLight2);

      pointLight = new THREE.PointLight(
        isDark ? 0x60a5fa : 0x2563eb,
        isDark ? 2.5 : 1.8,
        10
      );
      pointLight.position.set(0, 1.5, 2.5);
      scene.add(pointLight);

      // --- RESIZE HANDLING ---
      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;

        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);

      // --- MOUSE MOVEMENT LISTENER ---
      const handleMouseMove = (e: MouseEvent) => {
        if (!interactive || prefersReducedMotion) return;
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        targetMouseX = (x - 0.5) * 2;
        targetMouseY = (y - 0.5) * 2;
      };

      const handleMouseLeave = () => {
        targetMouseX = 0;
        targetMouseY = 0;
      };

      if (interactive) {
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);
      }

      // --- ANIMATION LOOP ---
      const clock = new THREE.Clock();

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        if (!prefersReducedMotion) {
          // Smooth mouse lerp
          currentMouseX += (targetMouseX - currentMouseX) * 0.05;
          currentMouseY += (targetMouseY - currentMouseY) * 0.05;

          // Subtle floating oscillation
          mainBookGroup.position.y = 0.25 + Math.sin(elapsedTime * 1.2) * 0.07;
          mainBookGroup.rotation.y = -0.45 + Math.sin(elapsedTime * 0.8) * 0.04 + currentMouseX * 0.25;
          mainBookGroup.rotation.x = 0.3 + currentMouseY * 0.18;

          satelliteBook.position.y = 0.9 + Math.cos(elapsedTime * 1.4) * 0.05;
          satelliteBook.rotation.y = 0.6 + Math.sin(elapsedTime * 0.9) * 0.06 - currentMouseX * 0.15;

          stackGroup.position.y = -0.9 + Math.sin(elapsedTime * 0.6) * 0.02;
          stackGroup.rotation.y = currentMouseX * 0.08;

          // Master group gentle parallax tilt
          rootGroup.rotation.y = currentMouseX * 0.12;
          rootGroup.rotation.x = -currentMouseY * 0.08;
        }

        renderer.render(scene, camera);
      };

      animate();

      // CLEANUP
      return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
        if (interactive) {
          container.removeEventListener('mousemove', handleMouseMove);
          container.removeEventListener('mouseleave', handleMouseLeave);
        }

        // Dispose Three.js objects
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        });

        renderer.dispose();
      };
    } catch (err) {
      console.warn('Three.js initialization safely bypassed to fallback:', err);
      setTimeout(() => {
        setRenderError(true);
      }, 0);
    }
  }, [hasWebGL, prefersReducedMotion, theme, renderError, interactive]);

  // Fallback View if WebGL is unavailable or failed
  if (!hasWebGL || renderError) {
    return (
      <div
        className={cn(
          'relative w-full aspect-4/3 sm:aspect-video max-h-[480px] rounded-2xl overflow-hidden border border-border-subtle bg-linear-to-b from-canvas-subtle to-surface flex items-center justify-center p-6 select-none shadow-elevated',
          className
        )}
      >
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md p-6">
          <div className="relative mb-6 group cursor-pointer">
            <div className="w-28 h-36 rounded-lg bg-brand text-brand-foreground shadow-modal flex flex-col justify-between p-4 border border-white/10 transform transition-transform duration-300 ease-spring group-hover:scale-105 group-hover:-rotate-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest uppercase opacity-75">LIBFLOW</span>
                <Sparkles className="w-4 h-4 text-brand-accent opacity-90" />
              </div>
              <div className="space-y-1.5">
                <div className="w-16 h-1 bg-current opacity-30 rounded-full" />
                <div className="w-10 h-1 bg-current opacity-20 rounded-full" />
              </div>
              <div className="text-[9px] font-mono text-right opacity-60">Vol. 01</div>
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-2.5 bg-black/15 dark:bg-white/10 rounded-full blur-[2px]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-canvas border border-border-subtle text-canvas-muted mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>High-Fidelity Editorial Visual</span>
          </div>

          <h4 className="text-base sm:text-lg font-semibold tracking-tight font-sans text-canvas-text">
            {fallbackTitle}
          </h4>

          <p className="text-xs text-canvas-muted mt-1 leading-relaxed">
            Rendering high-performance editorial representation. Fully optimized for all screen readers and battery-saving modes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-4/3 sm:aspect-video max-h-[500px] rounded-2xl overflow-hidden border border-border-subtle bg-gradient-to-b from-canvas-subtle/70 via-surface to-canvas-subtle/40 flex items-center justify-center select-none shadow-elevated group',
        className
      )}
    >
      {/* Background Architectural Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Hardware-accelerated Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing focus:outline-none"
        aria-label="Interactive 3D representation of floating books and library circulation architecture"
        role="img"
      />

      {/* Floating Status / Interactive Pill */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto flex items-center justify-between sm:justify-start gap-2 px-3 py-1.5 rounded-full bg-surface/85 backdrop-blur-md border border-border-subtle text-[11px] font-mono text-canvas-muted shadow-ambient pointer-events-none transition-opacity duration-200 group-hover:opacity-100 opacity-80">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Interactive 3D Engine</span>
        </span>
        <span className="hidden sm:inline-block text-border-strong">•</span>
        <span className="hidden sm:flex items-center gap-1 text-[10px]">
          <Eye className="w-3 h-3 text-canvas-muted" />
          <span>Mouse Parallax Active</span>
        </span>
      </div>
    </div>
  );
};
