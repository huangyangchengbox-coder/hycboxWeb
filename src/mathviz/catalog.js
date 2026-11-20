export const MODES = [
  { id: 'fractal', en: 'FRACTALS', name: '分形画廊', hint: '放大不会把细节放大没' },
  { id: 'surface', en: 'SURFACES', name: '函数曲面', hint: '改一个系数，山就变了' },
  { id: 'linear', en: 'LINEAR ALG', name: '线性代数', hint: '矩阵是空间的变形机器' },
  { id: 'fourier', en: 'FOURIER', name: '傅里叶圆舞', hint: '方波是一串圆转出来的' },
  { id: 'prob', en: 'PROBABILITY', name: '概率实验', hint: '钉板、撒点、正态钟形' },
  { id: 'quiz', en: 'QUIZ', name: '思维挑战', hint: '六题，直觉常常出错' }
]

export const MATH_QUIZ = [
  {
    q: 'Julia 集是一整块，还是碎成尘埃，取决于什么？',
    options: ['迭代次数', '参数 c 在不在 Mandelbrot 集里面', '色板'],
    answer: 1,
    why: 'c 在 Mandelbrot 集内时，对应的 Julia 集是连通的；在外面时，它碎成尘埃。'
  },
  {
    q: '一个 2×2 矩阵的行列式为 0，意味着？',
    options: ['它把平面旋转了 90°', '它把面积压扁，变换不可逆', '它一定是单位矩阵'],
    answer: 1,
    why: '行列式是单位正方形被变成的平行四边形的有向面积。面积变成 0，就有一个方向被压没了。'
  },
  {
    q: '方波的傅里叶级数在拐角处会怎样？',
    options: ['项数一多就和方波重合', '拐角附近始终有大约 9% 的过冲', '只会越来越平滑，没有过冲'],
    answer: 1,
    why: '这是 Gibbs 现象。过冲的高度不随项数消失，只是挤得更窄。'
  },
  {
    q: '高尔顿钉板底部堆起来的形状接近？',
    options: ['均匀分布', '二项分布，钉子很多时像正态钟形', '指数分布'],
    answer: 1,
    why: '每个钉子左或右一次，落到第 k 格的次数服从二项分布。'
  },
  {
    q: '往正方形里随机撒点，用什么估计 π？',
    options: ['点的平均距离', '落在四分之一圆里的比例乘以 4', '最外围那一圈点的个数'],
    answer: 1,
    why: '四分之一单位圆的面积是 π/4，所以比例乘 4 就接近 π。'
  },
  {
    q: '实特征向量是什么？',
    options: ['被矩阵拉伸、但方向不变的向量', '长度一定是 1 的向量', '矩阵的一行'],
    answer: 0,
    why: 'Av = λv。方向留在原来的直线上，长度乘以特征值。复数特征值时，平面里看不到这样的不动方向，只会转。'
  }
]

export const JULIA_PRESETS = [
  { name: '经典', re: -0.7, im: 0.27 },
  { name: '螺旋', re: -0.4, im: 0.6 },
  { name: '雪花', re: 0.285, im: 0.01 },
  { name: '龙', re: -0.8, im: 0.156 },
  { name: '尘埃', re: 0.5, im: 0.866 }
]
