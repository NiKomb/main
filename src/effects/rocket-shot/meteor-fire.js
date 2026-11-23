import { Blazes, Particles, PF, Rng, createFx } from 'pixelfx';
import { meta } from 'pixelfx/fx/fire/meteor';
import { hotFirst, simDraw } from 'pixelfx/fx/fire/_lib';

export function createMeteorFire(rocks, x, y) {
  const anchors = [];
  for (const rock of [...rocks].sort((a, b) => b.size - a.size)) {
    if (anchors.every((anchor) => Math.abs(anchor.x - rock.x) >= 12)) anchors.push(rock);
    if (anchors.length === 3) break;
  }
  if (!anchors.length) return;

  const { seed, palette } = meta.options;
  const colors = hotFirst(palette);
  const random = new Rng(seed);
  const particles = new Particles({ rng: random, sparks: [colors[1], colors[2], colors[4], colors[5]] });
  const blazes = new Blazes(particles);
  for (const rock of anchors) {
    // Use Meteor's landed-brand emitter at the upper edge of each existing rock.
    blazes.add(rock.x, rock.y - rock.size - .25, random.range(.9, 1.6), random.range(.5, .85));
  }
  const effect = createFx({
    meta: { loop: true },
    update(dt) {
      for (const blaze of blazes.list) {
        if (blaze.life <= dt) blaze.life += blaze.max;
      }
      const firstNewParticle = particles.list.length;
      blazes.update(dt);
      for (let i = firstNewParticle; i < particles.list.length; i++) particles.list[i].flag &= ~PF.SMOKES;
      particles.update(dt);
    },
    draw(painter) {
      blazes.drawBack(painter);
      simDraw(painter, particles, colors);
    },
  }, { x, y });
  return {
    effect,
    left: Math.floor(x + Math.min(...anchors.map((rock) => rock.x)) - 24),
    right: Math.ceil(x + Math.max(...anchors.map((rock) => rock.x)) + 24),
    top: Math.floor(y + Math.min(...anchors.map((rock) => rock.y - rock.size)) - 48),
    bottom: Math.ceil(y + Math.max(...anchors.map((rock) => rock.y)) + 16),
  };
}
