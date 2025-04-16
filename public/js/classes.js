class Sprite {
    constructor({
      position,
      imageSrc,
      scale = 1,
      framesMax = 1,
      offset = { x: 0, y: 0 }
    }) {
      this.position = position;
      this.width = 50;
      this.height = 150;
      this.image = new Image();
      this.image.src = imageSrc;
      this.scale = scale;
      this.framesMax = framesMax;
      this.framesCurrent = 0;
      this.framesElapsed = 0;
      this.framesHold = 5;
      this.offset = offset;
    }
  
    draw(c) {
      c.drawImage(
        this.image,
        this.framesCurrent * (this.image.width / this.framesMax),
        0,
        this.image.width / this.framesMax,
        this.image.height,
        this.position.x - this.offset.x,
        this.position.y - this.offset.y,
        (this.image.width / this.framesMax) * this.scale,
        this.image.height * this.scale
      );
    }
  
    animateFrames() {
      this.framesElapsed++;
      if (this.framesElapsed % this.framesHold === 0) {
        if (this.framesCurrent < this.framesMax - 1) {
          this.framesCurrent++;
        } else {
          this.framesCurrent = 0;
        }
      }
    }
  
    update(c) {
      this.draw(c);
      this.animateFrames();
    }
  }
  
  class Fighter extends Sprite {
    constructor({
      position,
      velocity,
      color = 'red',
      imageSrc,
      scale = 1,
      framesMax = 1,
      offset = { x: 0, y: 0 },
      sprites,
      attackBox = { offset: {}, width: undefined, height: undefined }
    }) {
      super({ position, imageSrc, scale, framesMax, offset });
      this.velocity = velocity;
      this.width = 50;
      this.height = 150;
      this.color = color;
      this.isAttacking = false;
      this.health = 100;
      this.dead = false;
  
      // Pentru animații
      this.currentSpriteName = 'idle';
      this.framesCurrent = 0;
      this.framesElapsed = 0;
      this.framesHold = 5;
  
      this.lastKey = null;
  
      this.attackBox = {
        position: { x: this.position.x, y: this.position.y },
        offset: attackBox.offset,
        width: attackBox.width,
        height: attackBox.height
      };
  
      this.sprites = sprites;
      for (const sprite in this.sprites) {
        this.sprites[sprite].image = new Image();
        this.sprites[sprite].image.src = this.sprites[sprite].imageSrc;
      }
    }
  
    update(c, canvasHeight, gravity = 0.7) {
      this.draw(c);
      if (!this.dead) this.animateFrames();
  
      // Actualizează poziția cutiei de atac
      this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
      this.attackBox.position.y = this.position.y + this.attackBox.offset.y;
  
      // Deplasare și gestionare "floor"
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      if (this.position.y + this.height >= canvasHeight - 96) {
        this.velocity.y = 0;
      } else {
        this.velocity.y += gravity;
      }
    }
  
    attack() {
      this.switchSprite('attack1');
      this.isAttacking = true;
    }
  
    takeHit(damage = 20) {
      this.health -= damage;
      if (this.health <= 0) {
        this.switchSprite('death');
      } else {
        this.switchSprite('takeHit');
      }
    }
  
    switchSprite(sprite) {
      // Setăm sprite-ul curent
      this.currentSpriteName = sprite;
  
      // Dacă sprite-ul "death" este apelat, dar nu este definit, afișăm un avertisment
      if (sprite === 'death' && !this.sprites.death) {
        console.warn('Sprite-ul "death" nu este definit!');
        return;
      }
  
      // Dacă deja rulăm animația de "death", la sfârșit marcăm ca mort
      if (this.sprites.death && this.image === this.sprites.death.image) {
        if (this.framesCurrent === this.sprites.death.framesMax - 1) {
          this.dead = true;
        }
        return;
      }
  
      // Dacă este "attack1" și animația nu s-a terminat, nu schimbăm sprite-ul
      if (
        this.sprites.attack1 &&
        this.image === this.sprites.attack1.image &&
        this.framesCurrent < this.sprites.attack1.framesMax - 1
      ) {
        return;
      }
  
      // Dacă este "takeHit" și animația nu s-a terminat, nu schimbăm sprite-ul
      if (
        this.sprites.takeHit &&
        this.image === this.sprites.takeHit.image &&
        this.framesCurrent < this.sprites.takeHit.framesMax - 1
      ) {
        return;
      }
  
      switch (sprite) {
        case 'idle':
          if (this.image !== this.sprites.idle.image) {
            this.image = this.sprites.idle.image;
            this.framesMax = this.sprites.idle.framesMax;
            this.framesCurrent = 0;
          }
          break;
  
        case 'run':
          if (this.image !== this.sprites.run.image) {
            this.image = this.sprites.run.image;
            this.framesMax = this.sprites.run.framesMax;
            this.framesCurrent = 0;
          }
          break;
  
        case 'jump':
          if (this.image !== this.sprites.jump.image) {
            this.image = this.sprites.jump.image;
            this.framesMax = this.sprites.jump.framesMax;
            this.framesCurrent = 0;
          }
          break;
  
        case 'fall':
          if (this.image !== this.sprites.fall.image) {
            this.image = this.sprites.fall.image;
            this.framesMax = this.sprites.fall.framesMax;
            this.framesCurrent = 0;
          }
          break;
  
        case 'attack1':
          if (this.image !== this.sprites.attack1.image) {
            this.image = this.sprites.attack1.image;
            this.framesMax = this.sprites.attack1.framesMax;
            this.framesCurrent = 0;
          }
          break;
  
        case 'takeHit':
          if (this.image !== this.sprites.takeHit.image) {
            this.image = this.sprites.takeHit.image;
            this.framesMax = this.sprites.takeHit.framesMax;
            this.framesCurrent = 0;
          }
          break;
  
        case 'death':
          if (this.sprites.death) {
            if (this.image !== this.sprites.death.image) {
              this.image = this.sprites.death.image;
              this.framesMax = this.sprites.death.framesMax;
              this.framesCurrent = 0;
            }
          }
          break;
      }
    }
  }
  