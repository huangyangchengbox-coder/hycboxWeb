<script setup>
defineProps({
  frame: { type: Object, required: true }
})
</script>

<template>
  <div class="play">
    <div class="cap">{{ frame.caption }}</div>
    <div v-if="frame.product" class="product" :key="frame.step">
      <span class="mat">
        <i>{{ frame.product.a }}</i><i>{{ frame.product.b }}</i>
        <i>{{ frame.product.c }}</i><i>{{ frame.product.d }}</i>
      </span>
      <span class="vec">
        <i>{{ frame.product.x }}</i>
        <i>{{ frame.product.y }}</i>
      </span>
      <span class="eq">=</span>
      <span class="vec out">
        <i>{{ frame.product.xp }}</i>
        <i>{{ frame.product.yp }}</i>
      </span>
    </div>
    <div v-for="(line, index) in frame.lines || []" :key="`${frame.step}-${index}`" class="line">
      <span
        v-for="(part, partIndex) in line"
        :key="partIndex"
        class="tok"
        :class="{ on: part.on, live: part.live }"
      >{{ part.text }}<sup v-if="part.sup">{{ part.sup === true ? '' : part.sup }}</sup><sub v-if="part.sub">{{ part.sub === true ? '' : part.sub }}</sub></span>
    </div>
    <p v-if="frame.foot" class="foot">{{ frame.foot }}</p>
  </div>
</template>

<style scoped>
.play {
  padding: 0.45rem 0.85rem 0.5rem;
  border-radius: 14px;
  background: rgba(8, 12, 20, 0.82);
  border: 1px solid rgba(125, 255, 232, 0.28);
  text-align: center;
  pointer-events: none;
}

.cap {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: rgba(125, 255, 232, 0.85);
}

.line {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  margin-top: 0.12rem;
  font-size: clamp(15px, 1.7vw, 22px);
  font-variant-numeric: tabular-nums;
}

.tok sup,
.tok sub {
  font-size: 0.62em;
  line-height: 0;
}

.tok.on {
  color: #7dffe8;
  animation: rise 0.45s ease;
}

.tok.live {
  color: #ffe08a;
}

.product {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.2rem;
  font-variant-numeric: tabular-nums;
  font-size: 14px;
}

.mat,
.vec {
  display: grid;
  padding: 0.15rem 0.35rem;
  border-left: 2px solid rgba(244, 251, 255, 0.55);
  border-right: 2px solid rgba(244, 251, 255, 0.55);
}

.mat {
  grid-template-columns: repeat(2, 2.4rem);
}

.vec {
  grid-template-columns: 2.6rem;
}

.mat i,
.vec i {
  font-style: normal;
}

.out i {
  color: #7dffe8;
}

.eq {
  font-size: 18px;
}

.foot {
  margin: 0.18rem 0 0;
  color: rgba(244, 251, 255, 0.62);
  font-size: 12px;
  line-height: 1.4;
}

@keyframes rise {
  from { opacity: 0.2; transform: translateY(5px); }
  to { opacity: 1; transform: none; }
}
</style>
