/* ============================================
   Pleasure Manor — Constellation Homepage
   Interactive node-based category navigation
   ============================================ */

const PM_Constellation = {

  // ---- Configuration ----
  config: {
    nodeMinRadius: 48,
    nodeMaxRadius: 74,
    connectionBaseOpacity: 0.07,
    connectionHoverOpacity: 0.35,
    connectionPulseAmp: 0.02,
    driftSpeed: 1,
    mouseInfluenceRadius: 250,
    mouseForce: 0.4,
    previewInterval: 2000,
    hoverDiameter: 400,
    dimOpacity: 0.25,
    padding: 80,
    minNodeDistance: 160,
    relaxIterations: 12,
  },

  // ---- Category relationships ----
  RELATIONS: {
    'anal':               ['hardcore', 'double-penetration', 'big-toys', 'toys'],
    'asian':              ['teen', 'massage', 'lesbian', 'stockings'],
    'bbc':                ['hardcore', 'big-tits', 'anal'],
    'big-tits':           ['hardcore', 'bbc', 'lesbian', 'stockings'],
    'big-toys':           ['toys', 'machine', 'anal'],
    'cosplay':            ['games', 'teen', 'stockings'],
    'double-penetration': ['anal', 'hardcore', 'bbc'],
    'games':              ['cosplay', 'teen'],
    'hardcore':           ['anal', 'bbc', 'double-penetration', 'big-tits'],
    'lesbian':            ['massage', 'toys', 'teen', 'stockings', 'asian'],
    'machine':            ['toys', 'big-toys', 'hardcore'],
    'massage':            ['lesbian', 'asian', 'teen'],
    'stockings':          ['big-tits', 'cosplay', 'asian', 'tattooed-women'],
    'tattooed-women':     ['hardcore', 'stockings'],
    'teen':               ['massage', 'asian', 'lesbian', 'cosplay', 'games'],
    'toys':               ['big-toys', 'machine', 'lesbian'],
  },

  // ---- State ----
  container: null,
  canvas: null,
  ctx: null,
  nodes: [],
  connections: [],
  mouse: { x: -9999, y: -9999 },
  hoveredNode: null,
  animationId: null,
  width: 0,
  height: 0,
  isMobile: false,
  isReducedMotion: false,
  _resizeTimeout: null,
  _boundTick: null,

  // ============================================
  // Lifecycle
  // ============================================

  init(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._setupCanvas();
    this._buildNodes();
    this._placeNodes();
    this._buildConnections();
    this._renderNodes();
    this._bindEvents();

    this._boundTick = this._tick.bind(this);
    this._tick();
  },

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.nodes = [];
    this.connections = [];
  },

  // ============================================
  // Canvas Setup
  // ============================================

  _setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'constellation__canvas';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this._resizeCanvas();
  },

  _resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  // ============================================
  // Build Nodes
  // ============================================

  _buildNodes() {
    const categories = PM_DATA.getCategoriesBySection('straight');
    if (!categories || !categories.length) return;

    // Get video count range for sizing
    const counts = categories.map(c => c.videoCount);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const countRange = maxCount - minCount || 1;

    // Shuffle for non-alphabetical layout
    const shuffled = [...categories].sort(() => Math.random() - 0.5);

    this.nodes = shuffled.map(cat => {
      const t = (cat.videoCount - minCount) / countRange;
      const radius = this.config.nodeMinRadius + t * (this.config.nodeMaxRadius - this.config.nodeMinRadius);

      return {
        category: cat,
        el: null,
        x: 0,
        y: 0,
        radius: radius,
        // Orbit params — set during placement
        originalX: 0,
        originalY: 0,
        orbitCenterX: 0,
        orbitCenterY: 0,
        orbitRadiusX: 0,
        orbitRadiusY: 0,
        orbitSpeed: 0,
        orbitAngle: 0,
        hovered: false,
      };
    });
  },

  // ============================================
  // Node Placement — Jittered Grid + Relaxation
  // ============================================

  _placeNodes() {
    const pad = this.config.padding;
    const usableW = this.width - pad * 2;
    const usableH = this.height - pad * 2;
    const count = this.nodes.length;

    if (count === 0 || usableW <= 0 || usableH <= 0) return;

    // Determine grid dimensions
    let cols, rows;
    if (this.isMobile && this.width < 768) {
      cols = 3;
      rows = Math.ceil(count / cols);
    } else {
      cols = 4;
      rows = Math.ceil(count / cols);
    }

    const cellW = usableW / cols;
    const cellH = usableH / rows;

    // Seed positions on jittered grid
    this.nodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const baseX = pad + col * cellW + cellW / 2;
      const baseY = pad + row * cellH + cellH / 2;

      node.x = baseX + (Math.random() - 0.5) * cellW * 0.55;
      node.y = baseY + (Math.random() - 0.5) * cellH * 0.55;
    });

    // Relaxation — push overlapping nodes apart
    for (let iter = 0; iter < this.config.relaxIterations; iter++) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = this.nodes[i];
          const b = this.nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = a.radius + b.radius + 50;

          if (dist < minDist) {
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
          }
        }
      }

      // Clamp to usable area
      for (const node of this.nodes) {
        node.x = this._clamp(node.x, pad + node.radius, this.width - pad - node.radius);
        node.y = this._clamp(node.y, pad + node.radius, this.height - pad - node.radius);
      }
    }

    // Set orbit parameters
    const mobileDrift = this.isMobile;
    for (const node of this.nodes) {
      node.originalX = node.x;
      node.originalY = node.y;
      node.orbitCenterX = node.x;
      node.orbitCenterY = node.y;

      if (mobileDrift || this.isReducedMotion) {
        node.orbitRadiusX = 0;
        node.orbitRadiusY = 0;
        node.orbitSpeed = 0;
      } else {
        node.orbitRadiusX = 12 + Math.random() * 28;
        node.orbitRadiusY = 8 + Math.random() * 20;
        node.orbitSpeed = 0.0003 + Math.random() * 0.0005;
      }
      node.orbitAngle = Math.random() * Math.PI * 2;
    }
  },

  // ============================================
  // Build Connections
  // ============================================

  _buildConnections() {
    this.connections = [];
    const added = new Set();

    this.nodes.forEach((nodeA, i) => {
      const related = this.RELATIONS[nodeA.category.id] || [];
      related.forEach(relatedId => {
        const j = this.nodes.findIndex(n => n.category.id === relatedId);
        if (j === -1) return;
        const key = Math.min(i, j) + '-' + Math.max(i, j);
        if (added.has(key)) return;
        added.add(key);
        this.connections.push({
          from: i,
          to: j,
          strength: 1.0,
          phase: Math.random() * Math.PI * 2,
        });
      });
    });
  },

  // ============================================
  // Render Node DOM Elements
  // ============================================

  _renderNodes() {
    for (const node of this.nodes) {
      const el = this._createNodeElement(node);
      node.el = el;
      this.container.appendChild(el);
      this._applyNodeTransform(node);
    }
  },

  _createNodeElement(node) {
    const size = node.radius * 2;
    const cat = node.category;

    const el = document.createElement('a');
    el.className = 'constellation__node';
    el.href = 'category.html?cat=' + cat.slug;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.setProperty('--glow-delay', (Math.random() * -4).toFixed(2) + 's');

    el.innerHTML =
      '<div class="constellation__node-glow"></div>' +
      '<div class="constellation__node-circle">' +
        '<img class="constellation__node-preview" alt="" draggable="false" />' +
        '<img class="constellation__node-preview" alt="" draggable="false" />' +
        '<svg class="constellation__node-progress" viewBox="0 0 100 100">' +
          '<circle cx="50" cy="50" r="46" />' +
        '</svg>' +
        '<div class="constellation__node-info">' +
          '<span class="constellation__node-name">' + cat.name + '</span>' +
          '<span class="constellation__node-count">' + cat.videoCount + ' videos</span>' +
        '</div>' +
      '</div>';

    // Prevent default link behavior — we handle navigation ourselves
    el.addEventListener('click', (e) => e.preventDefault());

    return el;
  },

  _applyNodeTransform(node) {
    node.el.style.transform = 'translate(' + (node.x - node.radius) + 'px, ' + (node.y - node.radius) + 'px)';
  },

  // ============================================
  // Event Binding
  // ============================================

  _bindEvents() {
    // Mouse tracking
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    this.container.addEventListener('mouseleave', () => {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    });

    // Node events
    this.nodes.forEach((node, i) => {
      if (!this.isMobile) {
        node.el.addEventListener('mouseenter', () => this._onNodeEnter(i));
        node.el.addEventListener('mouseleave', () => this._onNodeLeave(i));
        node.el.addEventListener('click', () => this._onNodeClick(i));
      } else {
        node.el.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this._onTouchStart(i);
        }, { passive: false });
      }
    });

    // Touch: tap background to dismiss hover
    if (this.isMobile) {
      this.container.addEventListener('touchstart', (e) => {
        if (!e.target.closest('.constellation__node') && this.hoveredNode !== null) {
          this._onNodeLeave(this.hoveredNode);
        }
      });
    }

    // Resize
    window.addEventListener('resize', () => {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = setTimeout(() => this._onResize(), 200);
    });
  },

  // ============================================
  // Animation Loop
  // ============================================

  _tick() {
    if (this.isReducedMotion) {
      // Render once, static
      this._drawConnections();
      this.nodes.forEach(n => this._applyNodeTransform(n));
      return;
    }

    this._applyMouseForce();
    this._updatePositions();
    this._drawConnections();

    this.animationId = requestAnimationFrame(this._boundTick);
  },

  _updatePositions() {
    for (const node of this.nodes) {
      if (node.hovered) continue;

      node.orbitAngle += node.orbitSpeed * 16.67 * this.config.driftSpeed;

      node.x = node.orbitCenterX + Math.cos(node.orbitAngle) * node.orbitRadiusX;
      node.y = node.orbitCenterY + Math.sin(node.orbitAngle * 0.7) * node.orbitRadiusY;

      this._applyNodeTransform(node);
    }
  },

  _applyMouseForce() {
    for (const node of this.nodes) {
      if (node.hovered) continue;

      const dx = node.x - this.mouse.x;
      const dy = node.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.config.mouseInfluenceRadius && dist > 1) {
        const force = this.config.mouseForce * (1 - dist / this.config.mouseInfluenceRadius);
        const nx = dx / dist;
        const ny = dy / dist;

        node.orbitCenterX += nx * force * 0.5;
        node.orbitCenterY += ny * force * 0.5;
      }

      // Spring back to original position
      node.orbitCenterX += (node.originalX - node.orbitCenterX) * 0.015;
      node.orbitCenterY += (node.originalY - node.orbitCenterY) * 0.015;
    }
  },

  // ============================================
  // Canvas — Connection Lines
  // ============================================

  _drawConnections() {
    const ctx = this.ctx;
    if (!ctx) return;

    // Skip on mobile
    if (this.isMobile && this.width < 768) return;

    ctx.clearRect(0, 0, this.width, this.height);

    const now = performance.now();

    for (const conn of this.connections) {
      const a = this.nodes[conn.from];
      const b = this.nodes[conn.to];

      // Base opacity with subtle pulse
      const pulse = Math.sin(now * 0.001 + conn.phase) * this.config.connectionPulseAmp;
      let opacity = this.config.connectionBaseOpacity * conn.strength + pulse;

      // Brighten if either endpoint is hovered
      if (a.hovered || b.hovered) {
        opacity = this.config.connectionHoverOpacity * conn.strength;
      }

      // Brighten near mouse
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const distToMouse = this._distance(midX, midY, this.mouse.x, this.mouse.y);
      if (distToMouse < 180) {
        const mouseBrightness = 0.08 + (1 - distToMouse / 180) * 0.12;
        opacity = Math.max(opacity, mouseBrightness);
      }

      // Dim if another node is hovered and this connection isn't involved
      if (this.hoveredNode !== null && !a.hovered && !b.hovered) {
        opacity *= 0.3;
      }

      opacity = this._clamp(opacity, 0, 1);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(139, 26, 43, ' + opacity.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },

  // ============================================
  // Hover Interaction
  // ============================================

  _onNodeEnter(i) {
    if (this.hoveredNode === i) return;

    // Clean up previous hover if any
    if (this.hoveredNode !== null) {
      this._onNodeLeave(this.hoveredNode);
    }

    const node = this.nodes[i];
    node.hovered = true;
    this.hoveredNode = i;

    // Calculate scale to reach fixed hover size regardless of original node size
    const scale = this.config.hoverDiameter / (node.radius * 2);
    node.el.style.setProperty('--hover-scale', scale.toFixed(3));

    node.el.classList.add('constellation__node--hovered');

    // Dim others
    this.nodes.forEach((n, j) => {
      if (j !== i) n.el.classList.add('constellation__node--dimmed');
    });

    this._startPreview(i);
  },

  _onNodeLeave(i) {
    const node = this.nodes[i];
    if (!node) return;

    node.hovered = false;
    this.hoveredNode = null;

    node.el.classList.remove('constellation__node--hovered');

    this.nodes.forEach(n => n.el.classList.remove('constellation__node--dimmed'));

    this._stopPreview(i);
  },

  _onNodeClick(i) {
    const cat = this.nodes[i].category;
    window.location.href = 'category.html?cat=' + cat.slug;
  },

  _onTouchStart(i) {
    if (this.hoveredNode === i) {
      // Second tap — navigate
      this._onNodeClick(i);
    } else {
      // First tap — show hover
      if (this.hoveredNode !== null) {
        this._onNodeLeave(this.hoveredNode);
      }
      this._onNodeEnter(i);
    }
  },

  // ============================================
  // Preview — In-circle thumbnail cycling
  // ============================================

  _startPreview(nodeIndex) {
    const node = this.nodes[nodeIndex];
    const cat = node.category;
    const thumbs = PM_DATA.homeThumbs;
    if (!thumbs || thumbs.length === 0) return;

    const previews = node.el.querySelectorAll('.constellation__node-preview');
    if (previews.length < 2) return;

    const imgA = previews[0];
    const imgB = previews[1];

    // Shuffle thumbs for this session
    const shuffled = [...thumbs].sort(() => Math.random() - 0.5);
    let index = 0;
    let activeImg = imgA;
    let nextImg = imgB;
    let alive = true;

    // Show first image immediately
    imgA.src = PM_DATA.getHomeThumbUrl(cat.folder, shuffled[0]);
    imgA.classList.add('constellation__node-preview--active');
    imgB.classList.remove('constellation__node-preview--active');

    // Preload next image into the hidden slot
    if (shuffled.length > 1) {
      imgB.src = PM_DATA.getHomeThumbUrl(cat.folder, shuffled[1]);
    }
    index = 1;

    // Listen for progress ring animation iteration to swap images
    const progressCircle = node.el.querySelector('.constellation__node-progress circle');

    const onIteration = () => {
      if (!alive) return;

      // Fade in the next image ON TOP of the current one
      nextImg.classList.add('constellation__node-preview--active');

      const oldImg = activeImg;

      // Wait for the OLD image's fade-out to fully finish before touching its src
      const onFaded = () => {
        oldImg.removeEventListener('transitionend', onFaded);
        if (!alive) return;

        // Now it's fully invisible — safe to swap src for next cycle
        index = (index + 1) % shuffled.length;
        oldImg.src = PM_DATA.getHomeThumbUrl(cat.folder, shuffled[index]);
      };

      // Remove active after a frame so the transition fires cleanly
      requestAnimationFrame(() => {
        if (!alive) return;
        oldImg.addEventListener('transitionend', onFaded, { once: true });
        oldImg.classList.remove('constellation__node-preview--active');
      });

      // Swap refs
      activeImg = nextImg;
      nextImg = oldImg;
    };

    if (progressCircle) {
      progressCircle.addEventListener('animationiteration', onIteration);
    }

    // Store cleanup refs on the node
    node._previewCleanup = () => {
      alive = false;
      if (progressCircle) {
        progressCircle.removeEventListener('animationiteration', onIteration);
      }
      imgA.classList.remove('constellation__node-preview--active');
      imgB.classList.remove('constellation__node-preview--active');
    };
  },

  _stopPreview(nodeIndex) {
    const node = this.nodes[nodeIndex];
    if (!node) return;

    if (node._previewCleanup) {
      node._previewCleanup();
      node._previewCleanup = null;
    }
  },

  // ============================================
  // Resize
  // ============================================

  _onResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    this._resizeCanvas();
    this._placeNodes();

    // Update DOM positions
    this.nodes.forEach(n => this._applyNodeTransform(n));
  },

  // ============================================
  // Utilities
  // ============================================

  _distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  _lerp(a, b, t) {
    return a + (b - a) * t;
  },

  _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },
};
