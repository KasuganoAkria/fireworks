// 获取元素
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const messageEl = document.getElementById('message');
const fireworkSound = document.getElementById('firework-sound');
const bigFirework = document.getElementById('big-firework');
const dingSound = document.getElementById('ding');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function random(min, max) {
  return Math.random() * (max - min) + min;
}

// 普通烟花（保持不变）
class Firework {
  constructor(x, y, targetX, targetY, color, isBig = false) {
    this.x = x;
    this.y = canvas.height;
    this.targetX = targetX || random(100, canvas.width - 100);
    this.targetY = targetY || random(100, canvas.height / 2);
    this.color = color || `hsl(${random(0, 360)}, 100%, 60%)`;
    this.speed = random(4, 7);
    this.trail = [];
    this.exploded = false;
    this.particles = [];
    this.isBig = isBig;
  }

  launch() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 5) {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    } else {
      this.explode();
      return;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.shift();

    ctx.globalAlpha = 0.8;
    for (let i = 0; i < this.trail.length; i++) {
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, i === this.trail.length - 1 ? 2 : 0.8, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  explode() {
    if (this.exploded) return;
    this.exploded = true;

    const count = this.isBig ? 250 : 100;
    const sound = this.isBig ? bigFirework : fireworkSound;
    if (sound) {
      const clone = sound.cloneNode();
      clone.volume = this.isBig ? 0.7 : 0.3;
      clone.play().catch(() => {});
    }

    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(1, 6);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.particles.push(new Particle(this.x, this.y, this.color, vx, vy, random(0.6, 1)));
    }
  }

  update() {
    if (!this.exploded) {
      this.launch();
    } else {
      this.particles.forEach((p, i) => {
        p.update();
        if (p.life <= 0 || p.alpha < 0.05) {
          this.particles.splice(i, 1);
        }
      });
    }
  }

  draw() {
    if (!this.exploded) return;
    this.particles.forEach(p => p.draw());
  }
}

class Particle {
  constructor(x, y, color, vx, vy, alpha = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.alpha = alpha;
    this.gravity = 0.05;
    this.friction = 0.97;
    this.life = 100;
  }

  update() {
    this.vy *= this.friction;
    this.vx *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha *= 0.97;
    this.life--;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ❤️ 终极心形烟花：直接绘制心形粒子 + 动态效果
class HeartFirework {
  constructor(centerX, centerY, scale) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.scale = scale;
    this.particles = [];
    this.completed = false;
    this.startTime = Date.now();
    this.duration = 4000; // 总时长4秒

    // 生成高密度心形点
    this.points = this.generateHeartPoints(180); // 更密！
    this.createParticles();
  }

  generateHeartPoints(num) {
    const points = [];
    for (let i = 0; i < num; i++) {
      const t = (i / num) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      points.push({
        x: this.centerX + x * this.scale,
        y: this.centerY + y * this.scale
      });
    }
    return points;
  }

  createParticles() {
    this.points.forEach(point => {
      // 初始位置设为中心（准备向外炸）
      this.particles.push({
        startX: point.x,
        startY: point.y,
        x: this.centerX,
        y: this.centerY,
        color: `hsl(${random(320, 360)}, 100%, ${random(80, 100)}%)`,
        alpha: 0,
        phase: 'out' // 'out' -> 'in' -> 'hold' -> 'fade'
      });
    });

    // 播放音效
    setTimeout(() => {
      const sound = bigFirework;
      if (sound) {
        const clone = sound.cloneNode();
        clone.volume = 0.8;
        clone.play().catch(() => {});
      }
    }, 100);
  }

  update() {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);

    this.particles.forEach(p => {
      let t = elapsed;

      if (t < 800) {
        // 阶段1：从中心向外炸（0~800ms）
        const ratio = t / 800;
        const easeOut = 1 - Math.pow(1 - ratio, 3); // 缓动
        p.x = this.centerX + (p.startX - this.centerX) * easeOut;
        p.y = this.centerY + (p.startY - this.centerY) * easeOut;
        p.alpha = Math.min(ratio * 2, 1);
      } else if (t < 2500) {
        // 阶段2：保持心形（800~2500ms）
        p.x = p.startX;
        p.y = p.startY;
        p.alpha = 1;
      } else {
        // 阶段3：淡出（2500~4000ms）
        const fadeRatio = (t - 2500) / 1500;
        p.alpha = 1 - fadeRatio;
      }
    });

    if (elapsed >= this.duration) {
      this.completed = true;
    }
  }

  draw() {
    this.particles.forEach(p => {
      if (p.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  isActive() {
    return !this.completed;
  }
}

// ===== 全局控制 =====
let fireworks = [];
let messages = [
  "2026 新年快乐！",
  "新的一年",
  "万事胜意",
  "平安喜乐",
  "好运相伴"
];
let specialMessages = [
  "添慧",
  "2026年",
  "之后的路，我们一起走好吗？"
];

function showMessage(text, duration = 2000) {
  messageEl.textContent = text;
  messageEl.style.opacity = 0;
  setTimeout(() => {
    messageEl.style.opacity = 1;
  }, 100);
  setTimeout(() => {
    messageEl.style.opacity = 0;
  }, duration - 500);
}

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  fireworks.forEach((fw, i) => {
    fw.update();
    if (fw.exploded && fw.particles.length === 0) {
      fireworks.splice(i, 1);
    }
  });
  fireworks.forEach(fw => fw.draw());

  requestAnimationFrame(animate);
}

async function startStory() {
  await sleep(800);

  // 初始烟花
  for (let i = 0; i < 6; i++) {
    fireworks.push(new Firework(random(0, canvas.width), 0, null, null, null, false));
    await sleep(600);
  }

  await sleep(1500);

  // 倒计时
  for (let i = 5; i >= 1; i--) {
    playSound(dingSound);
    showMessage(i.toString(), 1000);
    await sleep(1000);
  }

  await sleep(500);

  // 新年快乐
  showMessage("2026 新年快乐！", 2000);
  for (let i = 0; i < 8; i++) {
    fireworks.push(new Firework(random(0, canvas.width), 0, null, null, null, true));
    await sleep(300);
  }

  await sleep(1000);

  // 四句祝福
  for (const msg of messages.slice(1)) {
    showMessage(msg, 2200);
    fireworks.push(new Firework(canvas.width / 2, 0, null, null, `hsl(${random(280,320)},100%,60%)`, true));
    await sleep(2200);
  }

  await sleep(800);

  // 高潮烟花
  showMessage("", 100);
  for (let i = 0; i < 12; i++) {
    fireworks.push(new Firework(random(0, canvas.width), 0, null, null, null, true));
    await sleep(500);
  }

  await sleep(1500);

  // ❤️ 终极心形烟花（现在一定成功！）
  const centerX = canvas.width / 2;
const centerY = canvas.height * 0.42;
// 将比例缩小到原先的一半，即画布最小边长的7%
const scale = Math.min(canvas.width, canvas.height) * 0.07; 
const heart = new HeartFirework(centerX, centerY, scale);

// 临时接管渲染
let interval = setInterval(() => {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  fireworks.forEach(fw => {
    fw.update();
    fw.draw();
  });

  heart.update();
  heart.draw();

  if (!heart.isActive()) {
    clearInterval(interval);
  }
}, 16);

await sleep(4200); // 等待心形完成
  // 浪漫告白
  for (const msg of specialMessages) {
    showMessage(msg, 2800);
    if (msg !== specialMessages[2]) {
      fireworks.push(new Firework(random(canvas.width * 0.3, canvas.width * 0.7), 0, null, null, `hsl(${random(300,350)},100%,65%)`, true));
    }
    await sleep(3000);
  }

  await sleep(1000);

  // 永恒烟火
  setInterval(() => {
    const isBig = Math.random() > 0.6;
    fireworks.push(new Firework(random(0, canvas.width), 0, null, null, null, isBig));
  }, 600);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function playSound(sound) {
  try {
    const clone = sound.cloneNode();
    clone.volume = 0.4;
    clone.play().catch(() => {});
  } catch (e) {}
}

window.onload = () => {
  animate();
  startStory();
};