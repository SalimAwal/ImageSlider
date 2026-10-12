console.log("slider.js is connected");

const year = document.querySelector(".year");
if (year) {
  year.textContent = new Date().getFullYear();
}

class ImageSlider {
  constructor(root) {
    this.root = root;
    this.track = root.querySelector(".slider-track");
    this.dotsContainer = root.querySelector(".slider-dots");
    this.prevButton = root.querySelector(".slider-prev");
    this.nextButton = root.querySelector(".slider-next");

    this.slides = Array.from(this.track.children);
    this.count = this.slides.length;

    this.index = 0;            // logical index (0 .. count - 1)
    this.position = 1;         // visual position on the track (includes clones)
    this.isMoving = false;
    this.fallbackTimer = null;
    this.touchStartX = null;

    this.labelSlides();

    // One slide (or none): nothing to navigate.
    if (this.count < 2) {
      this.prevButton?.remove();
      this.nextButton?.remove();
      this.dotsContainer?.remove();
      return;
    }

    this.addClones();
    this.createDots();
    this.bindEvents();
    this.render(false);
  }

  /* ---------- setup ---------- */

  labelSlides() {
    this.slides.forEach((slide, i) => {
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", `${i + 1} of ${this.count}`);
    });
  }

  addClones() {
    const firstClone = this.slides[0].cloneNode(true);
    const lastClone = this.slides[this.count - 1].cloneNode(true);

    [firstClone, lastClone].forEach((clone) => {
      clone.setAttribute("aria-hidden", "true");
      clone.removeAttribute("aria-label");
      clone.dataset.clone = "true";
    });

    this.track.prepend(lastClone);
    this.track.append(firstClone);
  }

  createDots() {
    this.slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      dot.addEventListener("click", () => this.goToIndex(i));
      this.dotsContainer.append(dot);
    });
    this.dots = Array.from(this.dotsContainer.children);
  }

  bindEvents() {
    this.prevButton.addEventListener("click", () => this.prev());
    this.nextButton.addEventListener("click", () => this.next());
    this.track.addEventListener("transitionend", (e) => {
      if (e.target === this.track && e.propertyName === "transform") {
        this.finishMove();
      }
    });

    // Keyboard: left / right arrows while focus is inside the slider
    this.root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.prev();
      if (e.key === "ArrowRight") this.next();
    });

    // Touch swipe
    this.root.addEventListener(
      "touchstart",
      (e) => { this.touchStartX = e.changedTouches[0].clientX; },
      { passive: true }
    );
    this.root.addEventListener(
      "touchend",
      (e) => {
        if (this.touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - this.touchStartX;
        this.touchStartX = null;
        if (Math.abs(dx) < 50) return;
        dx < 0 ? this.next() : this.prev();
      },
      { passive: true }
    );
  }

  /* ---------- navigation ---------- */

  next() {
    if (this.isMoving) return;
    this.index = (this.index + 1) % this.count;
    this.moveTo(this.position + 1);
  }

  prev() {
    if (this.isMoving) return;
    this.index = (this.index - 1 + this.count) % this.count;
    this.moveTo(this.position - 1);
  }

  goToIndex(target) {
    if (this.isMoving || target === this.index) return;
    this.index = target;
    this.moveTo(target + 1); // +1 because of the leading clone
  }

  /* ---------- movement ---------- */

  moveTo(position) {
    this.isMoving = true;
    this.position = position;
    this.render(true);

    // If transitions are disabled (e.g. reduced motion), transitionend never
    // fires, so finish immediately. Otherwise keep a safety-net timer.
    const duration =
      parseFloat(getComputedStyle(this.track).transitionDuration) * 1000 || 0;
    if (duration === 0) {
      this.finishMove();
    } else {
      this.fallbackTimer = setTimeout(() => this.finishMove(), duration + 100);
    }
  }

  finishMove() {
    if (!this.isMoving) return;
    clearTimeout(this.fallbackTimer);

    // Landed on a clone: jump (without animation) to the matching real slide.
    if (this.position === this.count + 1) {
      this.position = 1;
      this.render(false);
    } else if (this.position === 0) {
      this.position = this.count;
      this.render(false);
    }
    this.isMoving = false;
  }

  render(animate) {
    if (!animate) {
      this.track.style.transition = "none";
    }
    this.track.style.transform = `translateX(${this.position * -100}%)`;
    if (!animate) {
      void this.track.offsetWidth; // force reflow so the jump is applied instantly
      this.track.style.transition = "";
    }
    this.updateActiveState();
  }

  updateActiveState() {
    this.dots.forEach((dot, i) => {
      dot.setAttribute("aria-pressed", String(i === this.index));
    });
    this.slides.forEach((slide, i) => {
      slide.setAttribute("aria-hidden", String(i !== this.index));
    });
  }
}

// Initialise every slider on the page
document.querySelectorAll(".slider-component").forEach((el) => new ImageSlider(el));
