<template>
  <div class="tennis">
    <canvas ref="canvasRef" class="tennis-canvas"></canvas>
    <WorldMenu />

    <aside class="mode-panel">
      <div class="kicker">TENNIS</div>
      <h1>网球世界</h1>
      <p class="sub">{{ current.hint }}</p>
      <div class="mode-list">
        <button
          v-for="item in modes"
          :key="item.id"
          type="button"
          :class="{ on: item.id === modeId }"
          @click="chooseMode(item.id)"
        >
          <span class="mode-name">{{ item.name }}</span>
          <span class="mode-en">{{ item.en }}</span>
        </button>
      </div>
    </aside>

    <!-- A 技巧实验室 -->
    <aside v-if="modeId === 'lab'" class="info-panel">
      <div class="kicker">{{ shot.en }}</div>
      <h2>{{ shot.name }}</h2>
      <div class="shot-grid">
        <button
          v-for="item in shots"
          :key="item.id"
          type="button"
          :class="{ on: item.id === shotId }"
          @click="chooseShot(item.id)"
        >{{ item.name }}</button>
      </div>
      <p>{{ shot.desc }}</p>
      <p class="phase">动作阶段：{{ phaseName }}</p>

      <section v-if="labForce" class="force-card">
        <header class="force-head">
          <b>击球瞬间受力</b>
          <span>接触 {{ labForce.contactMs.toFixed(0) }} ms</span>
        </header>

        <div class="force-line">
          <span class="dot v"></span>
          <span>入射 v</span>
          <b>{{ labForce.vIn.toFixed(0) }}</b>
          <em>km/h</em>
          <span class="side">拍头 {{ labForce.vRacket.toFixed(0) }} · 出球 {{ labForce.vOut.toFixed(0) }}</span>
        </div>

        <div class="split">
          <i class="vn" :style="{ width: splitVn + '%' }"></i>
          <i class="vt" :style="{ width: 100 - splitVn + '%' }"></i>
        </div>
        <div class="force-legend">
          <span><i style="background: #38bdf8"></i>法向 v⊥ {{ labForce.vn.toFixed(0) }}</span>
          <span><i style="background: #22d3ee"></i>切向 v∥ {{ labForce.vt.toFixed(0) }}</span>
        </div>

        <div class="force-split">
          <i class="fn" :style="{ width: splitFn + '%' }"></i>
          <i class="fr" :style="{ width: 100 - splitFn + '%' }"></i>
        </div>
        <div class="force-legend">
          <span><i style="background: #ef4444"></i>F_N {{ labForce.fn.toFixed(0) }} N</span>
          <span><i style="background: #facc15"></i>F_r {{ labForce.fr.toFixed(0) }} N</span>
        </div>

        <div class="force-nums">
          <div><b>{{ labForce.f.toFixed(0) }} N</b><span>合力 F</span></div>
          <div><b>{{ labForce.rpmOut.toFixed(0) }}</b><span>转速 ω (rpm)</span></div>
          <div><b>μ {{ labForce.muNeed.toFixed(2) }}</b><span>所需摩擦</span></div>
        </div>

        <p class="force-note">{{ labForce.note }}</p>
        <p v-if="labForce.slip" class="force-slip">
          ⚠ 打滑：所需摩擦 μ {{ labForce.muNeed.toFixed(2) }} 超过拍线上限 {{ labForce.muMax }}，
          实际转速被截断到 {{ labForce.rpmOut.toFixed(0) }} rpm。
        </p>
        <p v-else class="force-ok">
          拍线上限 μ {{ labForce.muMax }}，需要 {{ labForce.muNeed.toFixed(2) }} 就够——拍面咬得住球。
        </p>

        <div class="chips force-chips">
          <button type="button" class="chip" :class="{ on: labMu === 0.55 }" @click="setLabMu(0.55)">标准新线 μ 0.55</button>
          <button type="button" class="chip" :class="{ on: labMu === 0.05 }" @click="setLabMu(0.05)">湿球旧线 μ 0.05</button>
        </div>
      </section>
      <ol>
        <li v-for="point in shot.points" :key="point">{{ point }}</li>
      </ol>
      <p class="warn">{{ shot.error }}</p>
      <div class="chips">
        <button
          v-for="item in surfaceList"
          :key="item"
          type="button"
          class="chip"
          :class="{ on: surfaceId === item }"
          @click="setSurface(item)"
        >{{ surfaceName(item) }}</button>
      </div>
      <p class="net" :class="{ hit: labNet.hit }">{{ labNet.text }}</p>
      <p class="note">一种常见做法，不是唯一打法。球的飞行按重力示意，球本身放大了，方便看清。</p>
    </aside>

    <!-- 站位解剖 -->
    <aside v-else-if="modeId === 'stance'" class="info-panel stance-panel">
      <div class="kicker">STANCE LAB</div>
      <h2>{{ stanceData.name }}</h2>
      <p class="note">{{ stanceData.en }} · {{ stanceData.badge }}</p>

      <div class="stance-tabs">
        <button
          v-for="item in stanceList"
          :key="item.id"
          type="button"
          :class="{ on: stanceData.id === item.id }"
          @click="chooseStance(item.id)"
        >
          <em>{{ item.index }}</em>
          <span>{{ item.name }}</span>
        </button>
      </div>

      <StanceMap :stance="stanceData" />

      <div class="stance-row">
        <b>适用场景</b>
        <span>{{ stanceData.scene }}</span>
      </div>
      <div class="stance-row">
        <b>发力与旋转</b>
        <span>{{ stanceData.logic }}</span>
      </div>
      <div class="stance-pros">
        <div>
          <b>优势</b>
          <span>{{ stanceData.pros }}</span>
        </div>
        <div class="cons">
          <b>劣势</b>
          <span>{{ stanceData.cons }}</span>
        </div>
      </div>

      <div class="stance-tip">
        <b>💡 选站位黄金法则</b>
        <p>{{ stanceTips }}</p>
      </div>
    </aside>

    <!-- 脚步与移动 -->
    <aside v-else-if="modeId === 'footwork'" class="info-panel foot-panel">
      <div class="kicker">FOOTWORK</div>
      <h2>{{ footScenario.title }}</h2>
      <p class="note">{{ footScenario.zone }} · {{ footScenario.tag }}</p>

      <div class="shot-grid">
        <button
          v-for="item in footScenarios"
          :key="item.id"
          type="button"
          :class="{ on: footData.id === item.id }"
          @click="chooseFootwork(item.id)"
        >{{ item.shortName }}</button>
      </div>

      <p class="phase">{{ footData.phase }}</p>
      <p class="note">{{ footData.footCue }}</p>

      <dl class="foot-stats">
        <div><dt>周期</dt><dd>{{ footScenario.duration.toFixed(1) }} s</dd></div>
        <div><dt>移动</dt><dd>{{ footTravel.toFixed(2) }} m</dd></div>
        <div><dt>足印</dt><dd>{{ footMarks }}</dd></div>
      </dl>

      <h3>五步闭环周期</h3>
      <ol class="cycle">
        <li v-for="phase in footCycle" :key="phase.en">
          <i :style="{ background: phase.color }">{{ phase.idx }}</i>
          <div>
            <b>{{ phase.name }} · {{ phase.en }}</b>
            <span>{{ phase.text }}</span>
          </div>
        </li>
      </ol>

      <h3>全场三大区域</h3>
      <div v-for="zone in footZones" :key="zone.id" class="zone-card" :style="{ borderLeftColor: zone.color }">
        <b>{{ zone.name }}</b>
        <span class="zone-range">{{ zone.range }}</span>
        <span class="zone-desc">{{ zone.desc }}</span>
        <ul>
          <li v-for="point in zone.points" :key="point">{{ point }}</li>
        </ul>
        <span class="zone-foot">{{ zone.foot }} · {{ zone.rhythm }}</span>
      </div>
      <p class="note">2D 俯视图里两只脚交替落下，玫红为左脚、天蓝为右脚，黄色圆圈是分腿垫步。</p>
    </aside>

    <!-- 致命正手 / 弹道反手：纯 2D 几何实验室 -->
    <aside v-else-if="modeId === 'forehand' || modeId === 'backhand'" class="info-panel stroke-panel">
      <div class="kicker">{{ modeId === 'forehand' ? 'LETHAL FOREHAND' : 'BALLISTIC BACKHAND' }}</div>
      <h2>{{ modeId === 'forehand' ? '致命正手' : '弹道反手' }}</h2>
      <p v-if="modeId === 'forehand'" class="note">
        现代正手是「双摆鞭打」：髋先转、肩后转形成 X-Factor；拍头下坠后内旋前臂，
        走出陡峭的雨刷螺旋。强上旋带来的马格努斯下压让球在过网后急坠，落在底线内。
      </p>
      <p v-else class="note">
        反手分两种构型：单反以肩为单支点、大半径离心摆动，击球点最靠前；
        双反用双肩与握把构成闭合三角形，抗扭刚度高、更容易打直线。
        两者都走低平弹道压缩对手反应时间。
      </p>
      <table class="data">
        <tbody v-if="modeId === 'forehand'">
          <tr><td>拍头线速度</td><td>{{ strokeFh.speed }} km/h</td></tr>
          <tr><td>上旋转速</td><td>{{ strokeFh.rpm }} rpm</td></tr>
          <tr><td>过网余量</td><td>+{{ strokeFh.netClear.toFixed(2) }} m</td></tr>
          <tr><td>二跳弹射角</td><td>{{ strokeFh.bounceAngle }}°</td></tr>
        </tbody>
        <tbody v-else>
          <tr><td>有效力臂</td><td>{{ strokeBh.radius.toFixed(2) }} m</td></tr>
          <tr><td>出射仰角</td><td>{{ strokeBh.launch.toFixed(1) }}°</td></tr>
          <tr><td>球场射界</td><td>{{ strokeBh.courtDist.toFixed(2) }} m</td></tr>
          <tr><td>飞行时间</td><td>{{ strokeBh.flightTime.toFixed(2) }} s</td></tr>
        </tbody>
      </table>
      <p class="note">左侧是完整的生物力学与弹道画布，参数在画布下方调节；切到「几何对比矩阵」可看三种击球的全维度对照。</p>
    </aside>

    <!-- 握拍图鉴 -->
    <aside v-else-if="modeId === 'grip'" class="info-panel grip-panel">
      <div class="kicker">GRIP ATLAS</div>
      <h2>{{ gripData.name }}</h2>
      <p class="note">{{ gripData.en }} · V 字对 {{ gripData.bevel }} 号棱
        <template v-if="!gripData.compare">· 手相对东方式转动 {{ gripData.handRot > 0 ? '+' : '' }}{{ gripData.handRot }}°</template>
      </p>

      <template v-if="!gripData.compare">
        <h3 class="sec-title">适用技术</h3>
        <p class="strokes">{{ gripData.strokes }}</p>

        <h3 class="sec-title">握法要领</h3>
        <ul class="points">
          <li v-for="(p, i) in gripData.points" :key="i">{{ p }}</li>
        </ul>

        <h3 class="sec-title">掌心朝向</h3>
        <p class="palm">{{ gripData.palmNote }}</p>

        <div class="pc">
          <div><b>优势</b><span>{{ gripData.pros }}</span></div>
          <div class="cons"><b>局限</b><span>{{ gripData.cons }}</span></div>
        </div>

        <div class="tip">
          <b>教学提示</b>
          <span>{{ gripData.tip }}</span>
        </div>
        <p class="note">击球参考：{{ gripData.contact }}</p>
      </template>

      <template v-else>
        <p class="note">{{ gripIntro.lead }}</p>
        <h3 class="sec-title">怎么读对比陈列</h3>
        <ul class="points">
          <li>六只手握着同一支拍柄——颜色即当前选中的握法</li>
          <li>高亮点标出各自 V 字（虎口）落点的棱位</li>
          <li>从东方式到西方式，手掌沿柄下滑整整 90°</li>
          <li>点上面的握拍按钮可回到单握详解特写</li>
        </ul>
      </template>

      <div class="grip-list">
        <button
          v-for="item in gripList"
          :key="item.id"
          type="button"
          class="chip"
          :class="{ on: gripData.gripId === item.id }"
          :style="gripData.gripId === item.id ? { borderColor: item.color, color: item.color } : {}"
          @click="chooseGrip(item.id)"
        >{{ item.name }}</button>
      </div>
      <p class="note">{{ gripIntro.note }}</p>
    </aside>

    <!-- 网球解剖 -->
    <aside v-else-if="modeId === 'balllab'" class="info-panel ball-panel">
      <div class="kicker">BALL LAB</div>
      <h2>{{ ballData.typeName }}</h2>
      <p class="note">{{ ballData.brandName }} · {{ ballData.tag }}</p>

      <div class="ball-types">
        <button
          v-for="item in ballTypes"
          :key="item.id"
          type="button"
          :class="{ on: ballData.typeId === item.id }"
          :style="ballData.typeId === item.id ? { borderColor: item.hex, background: 'rgba(255,255,255,0.06)' } : {}"
          @click="setBallType(item.id)"
        >
          <i :style="{ background: item.hex }"></i>
          <span>{{ item.name }}</span>
          <em>{{ item.en }}</em>
        </button>
      </div>

      <p>{{ ballData.desc }}</p>

      <table class="data">
        <tbody>
          <tr><td>标签</td><td>{{ ballData.tag }}</td></tr>
          <tr><td>气压</td><td>{{ ballData.pressure }}</td></tr>
          <tr><td>回弹高度</td><td>{{ ballData.rebound }} cm</td></tr>
          <tr><td>使用寿命</td><td>{{ ballData.life }}</td></tr>
          <tr><td>直径</td><td>{{ ITF_SPEC.diameter[0] }}–{{ ITF_SPEC.diameter[1] }} cm</td></tr>
          <tr><td>质量</td><td>{{ ITF_SPEC.mass[0] }}–{{ ITF_SPEC.mass[1] }} g</td></tr>
        </tbody>
      </table>

      <BallBounceChart :items="bounceItems" />

      <div class="ball-pros">
        <div><b>优势</b><span>{{ ballData.pros }}</span></div>
        <div class="cons"><b>局限</b><span>{{ ballData.cons }}</span></div>
      </div>

      <h3>品牌 / 赛事用球</h3>
      <div class="brand-grid">
        <button
          v-for="item in ballBrands"
          :key="item.id"
          type="button"
          :class="{ on: ballData.brandId === item.id }"
          @click="setBallBrand(item.id)"
        >
          <i :style="{ background: item.hex }"></i>
          <span>{{ item.name }}</span>
          <em>{{ item.model }}</em>
        </button>
      </div>
      <p class="note">{{ brandNote }}</p>

      <div class="chips">
        <button type="button" class="chip" :class="{ on: ballData.cutaway }" @click="toggleCutaway">剖面</button>
        <button type="button" class="chip" :class="{ on: ballData.spin }" @click="toggleBallSpin">旋转</button>
      </div>

      <h3>结构分层</h3>
      <ul class="layers">
        <li v-for="layer in ballLayers" :key="layer.id">
          <i :style="{ background: layer.color }"></i>
          <div>
            <b>{{ layer.name }} · {{ layer.en }}</b>
            <span>{{ layer.note }}</span>
          </div>
        </li>
      </ul>
    </aside>

    <!-- 发球计算 -->
    <aside v-else-if="modeId === 'serve'" class="info-panel">
      <div class="kicker">{{ serveData.en }}</div>
      <h2>{{ serveData.name }}</h2>
      <div class="shot-grid">
        <button type="button" :class="{ on: serveData.id === 'flat' }" @click="setServe('flat')">平击发球</button>
        <button type="button" :class="{ on: serveData.id === 'slice' }" @click="setServe('slice')">侧旋发球</button>
        <button type="button" :class="{ on: serveData.id === 'kick' }" @click="setServe('kick')">上旋发球</button>
      </div>
      <div class="chips">
        <button type="button" class="chip" :class="{ on: serveData.side === 'deuce' }" @click="setServeSide('deuce')">平分区</button>
        <button type="button" class="chip" :class="{ on: serveData.side === 'ad' }" @click="setServeSide('ad')">占先区</button>
      </div>
      <p>{{ serveData.desc }}</p>
      <p class="net" :class="{ hit: !serveData.inBox }">{{ serveData.summary }}</p>
      <table class="data">
        <tbody>
          <tr v-for="row in serveData.rows" :key="row.k">
            <td>{{ row.k }}</td>
            <td>{{ row.v }}</td>
          </tr>
        </tbody>
      </table>
      <ol>
        <li v-for="point in serveData.points" :key="point">{{ point }}</li>
      </ol>
      <div class="chips">
        <button
          v-for="item in surfaceList"
          :key="item"
          type="button"
          class="chip"
          :class="{ on: serveData.surfaceId === item }"
          @click="setServeSurface(item)"
        >{{ surfaceName(item) }}</button>
      </div>
      <p class="note">侧视看击球高度、出射角和弦倾角；过网镜头看净空；俯视和落点镜头看进区距离。落点按球心，净空按球底到网带。</p>
      <p class="note">平分区站在中线右侧，发向对角发球区。脚在底线后，击球点可以进入场内。速度和转速是教学模型里的示意值。</p>
    </aside>

    <!-- 切削发球生物力学 -->
    <aside v-else-if="modeId === 'sliceserve'" class="info-panel">
      <template v-if="sliceData.info">
        <div class="kicker">SLICE BIOMECH</div>
        <h2>切削发球实验室</h2>
        <div class="shot-grid">
          <button type="button" :class="{ on: sliceData.mode === 'slice' }" @click="setSliceKind('slice')">⚡ 切削发球</button>
          <button type="button" :class="{ on: sliceData.mode === 'flat' }" @click="setSliceKind('flat')">🚀 平击发球</button>
          <button type="button" :class="{ on: sliceData.mode === 'compare' }" @click="setSliceKind('compare')">⚖️ 双轨对比</button>
        </div>
        <div class="chips">
          <button type="button" class="chip" :class="{ on: !sliceData.left }" @click="setSliceHand(false)">右手持拍</button>
          <button type="button" class="chip" :class="{ on: sliceData.left }" @click="setSliceHand(true)">左手持拍</button>
          <button type="button" class="chip" :class="{ on: sliceData.deuce }" @click="setSliceSide(true)">一区</button>
          <button type="button" class="chip" :class="{ on: !sliceData.deuce }" @click="setSliceSide(false)">二区</button>
        </div>

        <p class="note badge">{{ sliceData.info.badge }}</p>
        <h3 class="stage-title">{{ sliceData.info.title }}</h3>
        <p>{{ sliceData.info.desc }}</p>

        <table class="data">
          <tbody>
            <tr><td>发力能量分配</td><td style="color:#bef264">{{ sliceData.info.force }}</td></tr>
            <tr><td>时钟抛球方位</td><td style="color:#7dd3fc">{{ sliceData.info.toss }}</td></tr>
            <tr><td>击球摩擦部位</td><td style="color:#fde047">{{ sliceData.info.contact }}</td></tr>
          </tbody>
        </table>

        <div class="mistake">
          <b>⚠️ 常见错误与纠正</b>
          <p>{{ sliceData.info.mistake }}</p>
        </div>

        <div class="shot-grid two">
          <button type="button" @click="sliceJumpKeyframe('trophy')">🎯 奖杯蓄力帧</button>
          <button type="button" @click="sliceJumpKeyframe('contact')">⚡ 3点钟切击帧</button>
        </div>

        <div class="helpers">
          <label><input type="checkbox" :checked="sliceHelpers.clock" @change="sliceToggleHelper('clock')" /> 🕒 3D时钟定位盘</label>
          <label><input type="checkbox" :checked="sliceHelpers.ribbon" @change="sliceToggleHelper('ribbon')" /> 🎀 实时拍头轨迹拖尾</label>
          <label><input type="checkbox" :checked="sliceHelpers.normal" @change="sliceToggleHelper('normal')" /> 📐 拍面法线方向箭头</label>
          <label><input type="checkbox" :checked="sliceHelpers.vectors" @change="sliceToggleHelper('vectors')" /> 🧲 马格努斯力与旋转轴</label>
          <label><input type="checkbox" :checked="sliceHelpers.trajectory" @change="sliceToggleHelper('trajectory')" /> 📈 飞行与弹跳预测线</label>
        </div>

        <p class="note">
          切削抛球偏持拍侧（{{ sliceData.left ? '10点半' : '1点半' }}钟方向、入底线内约 40 cm），
          用拍面刷切球体{{ sliceData.left ? '9' : '3' }}点钟边缘；70% 向前穿透 + 30% 侧面摩擦——"只切不打"会下网。
          落地后侧旋触发马格努斯效应，球向外角低平外窜。双轨对比模式可同时看平击与切削的弧线与弹跳差异。
        </p>
        <p class="note">速度与转速为教学示意值；空格播放/暂停，左右方向键逐帧。</p>
      </template>
    </aside>

    <!-- 上旋发球实验室 -->
    <aside v-else-if="modeId === 'topspinserve'" class="info-panel">
      <template v-if="topspinData.info">
        <div class="kicker">TOPSPIN BIOMECH</div>
        <h2>上旋发球实验室</h2>
        <div class="shot-grid">
          <button type="button" :class="{ on: topspinData.mode === 'topspin' }" @click="setTopspinKind('topspin')">🌀 上旋发球</button>
          <button type="button" :class="{ on: topspinData.mode === 'flat' }" @click="setTopspinKind('flat')">🚀 平击发球</button>
          <button type="button" :class="{ on: topspinData.mode === 'compare' }" @click="setTopspinKind('compare')">⚖️ 双轨对比</button>
        </div>
        <div class="chips">
          <button type="button" class="chip" :class="{ on: !topspinData.left }" @click="setTopspinHand(false)">右手持拍</button>
          <button type="button" class="chip" :class="{ on: topspinData.left }" @click="setTopspinHand(true)">左手持拍</button>
          <button type="button" class="chip" :class="{ on: topspinData.deuce }" @click="setTopspinSide(true)">一区</button>
          <button type="button" class="chip" :class="{ on: !topspinData.deuce }" @click="setTopspinSide(false)">二区</button>
        </div>

        <p class="note badge">{{ topspinData.info.badge }}</p>
        <h3 class="stage-title">{{ topspinData.info.title }}</h3>
        <p>{{ topspinData.info.desc }}</p>

        <table class="data">
          <tbody>
            <tr><td>发力能量分配</td><td style="color:#bef264">{{ topspinData.info.force }}</td></tr>
            <tr><td>时钟抛球方位</td><td style="color:#7dd3fc">{{ topspinData.info.toss }}</td></tr>
            <tr><td>击球摩擦部位</td><td style="color:#fde047">{{ topspinData.info.contact }}</td></tr>
          </tbody>
        </table>

        <!-- 受力点分析 -->
        <div class="force-cards">
          <div class="force-card" v-for="fp in forcePoints" :key="fp.id">
            <b :style="{ color: fp.color }">{{ fp.name }}</b>
            <p>{{ fp.desc }}</p>
          </div>
        </div>

        <div class="mistake">
          <b>⚠️ 常见错误与纠正</b>
          <p>{{ topspinData.info.mistake }}</p>
        </div>

        <!-- 握拍 3D 特写 -->
        <div class="grip-block">
          <div class="shot-grid two">
            <button
              type="button"
              :class="{ on: topspinData.grip === 'continental' }"
              @click="setTopspinGrip('continental')"
            >✅ 大陆式握拍</button>
            <button
              type="button"
              :class="{ on: topspinData.grip === 'eastern' }"
              @click="setTopspinGrip('eastern')"
            >❌ 东方式对比</button>
          </div>
          <b class="grip-name">{{ gripInfo.grips[topspinData.grip].name }}</b>
          <ul class="grip-points">
            <li v-for="pt in gripInfo.grips[topspinData.grip].points" :key="pt">{{ pt }}</li>
          </ul>
          <p class="note">{{ gripInfo.grips[topspinData.grip].why }}</p>
          <button type="button" class="chip" :class="{ on: topspinHelpers.grip }" @click="toggleTopspinGripView">
            {{ topspinHelpers.grip ? '🎮 关闭握拍特写' : '🎮 打开握拍 3D 特写' }}
          </button>
        </div>

        <div class="shot-grid two">
          <button type="button" @click="topspinJumpKeyframe('trophy')">🎯 深蹲搔背帧</button>
          <button type="button" @click="topspinJumpKeyframe('contact')">⚡ 7→12点刷球帧</button>
        </div>

        <div class="helpers">
          <label><input type="checkbox" :checked="topspinHelpers.clock" @change="topspinToggleHelper('clock')" /> 🕒 3D时钟抛球盘</label>
          <label><input type="checkbox" :checked="topspinHelpers.ribbon" @change="topspinToggleHelper('ribbon')" /> 🎀 实时拍头轨迹拖尾</label>
          <label><input type="checkbox" :checked="topspinHelpers.normal" @change="topspinToggleHelper('normal')" /> 📐 拍面法线方向箭头</label>
          <label><input type="checkbox" :checked="topspinHelpers.vectors" @change="topspinToggleHelper('vectors')" /> 🧲 受力点·摩擦·马格努斯矢量</label>
          <label><input type="checkbox" :checked="topspinHelpers.brush" @change="topspinToggleHelper('brush')" /> ✍️ 7→12点钟刷球弧线</label>
          <label><input type="checkbox" :checked="topspinHelpers.trajectory" @change="topspinToggleHelper('trajectory')" /> 📈 飞行与弹跳预测线</label>
        </div>

        <p class="note">
          上旋抛球在头顶正上方略偏后（{{ topspinData.left ? '11:30-12:00' : '12:00-12:30' }}钟），
          拍头从球的后下方 7 点钟向上刷到 12 点钟：60% 向前穿透 + 40% 向上摩擦。
          马格努斯力向下压，所以可以打过网 1.5 m 的安全高度仍压进深区，落地后前冲高弹跳。
        </p>
        <p class="note">速度与转速为教学示意值；空格播放/暂停，左右方向键逐帧。</p>
      </template>
    </aside>

    <!-- 发球数学模型 -->
    <aside v-else-if="modeId === 'model'" class="info-panel model-panel">
      <div class="kicker">TRAJECTORY MATH</div>
      <h2>发球过网的抛物线</h2>
      <p class="formula">y(x) = h₀ + x·tanθ − g x² / (2v² cos²θ)</p>
      <p class="note">左侧是完整的数学模型图：侧视坐标、三条弹道、悬停探针与身高对照表。这里留 3D 场景的读数。</p>

      <table class="data">
        <tbody>
          <tr><td>球员身高</td><td>{{ modelData.heightCm }} cm</td></tr>
          <tr><td>击球点 h₀</td><td>{{ modelData.h0?.toFixed(2) }} m</td></tr>
          <tr><td>发球初速度</td><td>{{ modelData.speedKmh }} km/h（{{ modelData.v?.toFixed(2) }} m/s）</td></tr>
          <tr><td style="color:#fbbf58">贴网最近落点</td><td>{{ modelData.near ? modelData.near.distFromNet.toFixed(2) + ' m' : '—' }}</td></tr>
          <tr><td style="color:#6ee7b7">最远落点过网</td><td>{{ modelData.far ? modelData.far.yAtNet.toFixed(2) + ' m' : '—' }}</td></tr>
          <tr><td style="color:#6ee7b7">最远落点净空</td><td>{{ modelData.far ? (modelData.far.clearance * 100).toFixed(1) + ' cm' : '—' }}</td></tr>
          <tr><td style="color:#7db6f5">自定义角</td><td>{{ modelData.custom?.thetaDeg?.toFixed(2) }}° · {{ modelData.custom?.status }}</td></tr>
        </tbody>
      </table>

      <div class="chips">
        <button
          v-for="item in surfaceList"
          :key="item"
          type="button"
          class="chip"
          :class="{ on: modelData.surfaceId === item }"
          @click="setModelSurface(item)"
        >{{ surfaceName(item) }}</button>
      </div>
      <p class="note">这个模式用解析抛物线，不带旋转和空气阻力；带旋转的对比在「发球计算」里。</p>
    </aside>

    <!-- B 旋转的科学 -->
    <aside v-else-if="modeId === 'spin'" class="info-panel">
      <div class="kicker">SPIN SCIENCE</div>
      <h2>上旋为什么不一样</h2>
      <p>三颗球同一初速、同一出射角，只有旋转不同。马格努斯力让上旋往下压、下旋往上托。</p>
      <div class="slider">
        <label>转速 {{ spinData.rpm }} rpm</label>
        <input
          type="range"
          min="0"
          max="4000"
          step="100"
          :value="spinData.rpm"
          @input="onRpm"
        />
      </div>
      <table class="data">
        <thead>
          <tr><th>类型</th><th>过网</th><th>落点</th><th>弹起</th></tr>
        </thead>
        <tbody>
          <tr v-for="lane in spinData.lanes" :key="lane.id">
            <td :style="{ color: lane.color }">{{ lane.name }}</td>
            <td>{{ lane.netHeight === null ? '—' : lane.netHeight.toFixed(2) + ' m' }}</td>
            <td>{{ lane.landZ === null ? '—' : landText(lane.landZ) }}</td>
            <td>{{ lane.bounceHeight ? lane.bounceHeight.toFixed(2) + ' m' : '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div class="chips">
        <button
          v-for="item in surfaceList"
          :key="item"
          type="button"
          class="chip"
          :class="{ on: spinData.surfaceId === item }"
          @click="setSpinSurface(item)"
        >{{ surfaceName(item) }}</button>
        <button type="button" class="chip" :class="{ on: spinData.showForces }" @click="toggleForces">力矢量</button>
      </div>
      <p class="note">{{ spinData.surf?.note }}。弹跳参数为教学示意值，非 ITF 实测。</p>
      <p class="note">转速参考：职业顶尖正手 3000+ rpm，业余多在 1000–2000 rpm。</p>

      <h3 class="sec-title">接触瞬间：同一来球，三种刷法</h3>
      <ContactForceChart :cases="spinContact" :height="360" stack dense />
      <p class="note cfc-legend">
        <b class="lg-v">▬ v</b> <b class="lg-vn">▬ v⊥ 压进拍线</b> <b class="lg-vt">▬ v∥ 刷过拍面</b>
        <b class="lg-fn">▬ F_N</b> <b class="lg-fr">▬ F_r</b> <b class="lg-om">◠ ω</b>
      </p>
      <p class="note">
        三颗球的来球速度与拍头速度完全相同，区别只在刷球方向：上旋拍头由低往高走，摩擦把球向上「卷」；
        下旋由高往低切，摩擦反向，球倒转。把上面的转速拉到 0，ω 弧消失、F_r 归零——
        没有切向摩擦就没有旋转。
      </p>
    </aside>

    <!-- C 球场与规则 -->
    <aside v-else-if="modeId === 'court'" class="info-panel">
      <div class="kicker">COURT &amp; RULES</div>
      <h2>场地多大、怎么算分</h2>
      <div class="chips">
        <button
          v-for="item in surfaceList"
          :key="item"
          type="button"
          class="chip"
          :class="{ on: courtData.surfaceId === item }"
          @click="setCourtSurface(item)"
        >{{ surfaceName(item) }}</button>
      </div>
      <div class="chips">
        <button type="button" class="chip" :class="{ on: !courtData.singles }" @click="setSingles(false)">双打线</button>
        <button type="button" class="chip" :class="{ on: courtData.singles }" @click="setSingles(true)">单打线</button>
        <button type="button" class="chip" @click="nextServe">下一发球位</button>
      </div>
      <p class="serve">{{ serveText }}</p>
      <div class="score">
        <div class="score-row">
          <span class="who">A</span>
          <span class="pts">{{ pointLabel('a') }}</span>
          <span class="games">{{ score.games.a }}</span>
          <button type="button" @click="scoreA">A 得分</button>
        </div>
        <div class="score-row">
          <span class="who">B</span>
          <span class="pts">{{ pointLabel('b') }}</span>
          <span class="games">{{ score.games.b }}</span>
          <button type="button" @click="scoreB">B 得分</button>
        </div>
        <p v-if="score.advantage" class="adv">{{ score.advantage === 'a' ? 'A 占先' : 'B 占先' }}</p>
        <p v-if="score.tiebreak" class="adv">抢七中</p>
        <button type="button" class="reset" @click="resetScore">重置比分</button>
      </div>
      <p class="log">{{ score.log[score.log.length - 1] }}</p>
      <ul class="rules">
        <li v-for="rule in rules" :key="rule.q"><b>{{ rule.q }}</b>：{{ rule.a }}</li>
      </ul>
    </aside>

    <!-- D 历史长廊 -->
    <aside v-else-if="modeId === 'history'" class="info-panel">
      <div class="kicker">HISTORY</div>
      <h2>这项运动怎么来的</h2>
      <p class="year">{{ historyData.item.year }}</p>
      <p>{{ historyData.item.text }}</p>
      <p class="note">同期球拍：{{ historyData.racketName }}</p>
      <div class="timeline">
        <button
          v-for="(item, index) in timeline"
          :key="item.year"
          type="button"
          class="tick"
          :class="{ on: index === historyData.index }"
          @click="selectYear(index)"
        >{{ item.year }}</button>
      </div>
      <h3>中国节点</h3>
      <ul class="rules">
        <li v-for="item in china" :key="item.year"><b>{{ item.year }}</b>：{{ item.text }}</li>
      </ul>
      <p class="note">球拍进化：木拍 → 金属 → 碳纤维；球从白色改为荧光黄，是为了电视转播辨识度。</p>
    </aside>

    <!-- E 装备解剖 -->
    <aside v-else-if="modeId === 'gear'" class="info-panel">
      <div class="kicker">GEAR LAB</div>
      <h2>拍子参数意味着什么</h2>
      <div class="slider">
        <label>拍面 {{ gearData.gear.headArea }} in²</label>
        <input type="range" min="95" max="110" step="1" :value="gearData.gear.headArea" @input="onGear('headArea', $event)" />
      </div>
      <div class="slider">
        <label>重量 {{ gearData.gear.weight }} g</label>
        <input type="range" min="260" max="340" step="5" :value="gearData.gear.weight" @input="onGear('weight', $event)" />
      </div>
      <div class="slider">
        <label>平衡点 {{ gearData.gear.balance }} cm（头轻 ↔ 头重）</label>
        <input type="range" min="29" max="38" step="1" :value="gearData.gear.balance" @input="onGear('balance', $event)" />
      </div>
      <div class="slider">
        <label>穿线磅数 {{ gearData.gear.tension }} lbs</label>
        <input type="range" min="45" max="60" step="1" :value="gearData.gear.tension" @input="onGear('tension', $event)" />
      </div>
      <div class="chips">
        <button type="button" class="chip" :class="{ on: isPattern(16, 19) }" @click="setPattern([16, 19])">16×19</button>
        <button type="button" class="chip" :class="{ on: isPattern(18, 20) }" @click="setPattern([18, 20])">18×20</button>
      </div>
      <div class="slider">
        <label>击球点偏离甜区 {{ (gearData.offset * 100).toFixed(0) }} cm</label>
        <input type="range" min="0" max="14" step="1" :value="Math.round(gearData.offset * 100)" @input="onOffset" />
      </div>
      <p class="phase">出球速度保留约 {{ (gearData.factor * 100).toFixed(0) }}%</p>
      <p class="note">{{ gearData.balanceNote }}。拍面越大甜区越大、容错高，控制略降；低磅弹性大、高磅控制好。</p>
      <p class="note">ITF 限制：拍面长 ≤ 73.66 cm、宽 ≤ 31.75 cm。</p>
    </aside>

    <!-- F 训练挑战 -->
    <aside v-else-if="modeId === 'train'" class="info-panel">
      <div class="kicker">TRAINING</div>
      <h2>训练挑战</h2>
      <template v-if="!finished">
        <p class="quiz-index">第 {{ quizIndex + 1 }} / {{ quiz.length }} 题</p>
        <p class="quiz-q">{{ currentQuiz.q }}</p>
        <div class="quiz-options">
          <button
            v-for="(option, index) in currentQuiz.options"
            :key="option"
            type="button"
            :class="{ on: picked === index, right: picked !== null && index === currentQuiz.answer, wrong: picked === index && index !== currentQuiz.answer }"
            :disabled="picked !== null"
            @click="pick(index)"
          >{{ option }}</button>
        </div>
        <p v-if="picked !== null" class="why">{{ currentQuiz.why }}</p>
        <button v-if="picked !== null" type="button" class="reset" @click="nextQuiz">
          {{ quizIndex + 1 >= quiz.length ? '看结果' : '下一题' }}
        </button>
      </template>
      <template v-else>
        <p class="score-big">{{ correct }} / {{ quiz.length }}</p>
        <p class="note">{{ resultText }}</p>
        <button type="button" class="reset" @click="restartQuiz">再来一轮</button>
      </template>
    </aside>

    <footer v-if="modeId === 'lab'" class="dock">
      <button type="button" @click="toggle">{{ playing ? '暂停' : '播放' }}</button>
      <button type="button" @click="replay">重播</button>
      <input
        type="range"
        min="0"
        max="1000"
        :value="Math.round(progress * 1000)"
        @pointerdown="scrubbing = true"
        @pointerup="scrubbing = false"
        @change="scrubbing = false"
        @input="onScrub"
      />
      <span class="time">{{ phaseName }}</span>
      <button type="button" :class="{ on: speed === 0.5 }" @click="setSpeed(0.5)">0.5×</button>
      <button type="button" :class="{ on: speed === 1 }" @click="setSpeed(1)">1×</button>
      <button type="button" @click="scene?.setCamera('arena')">全场</button>
      <button type="button" @click="scene?.setCamera('side')">侧视</button>
      <button type="button" @click="scene?.setCamera('behind')">后视</button>
      <button type="button" @click="scene?.setCamera('top')">俯视</button>
      <button type="button" @click="scene?.setCamera('racket')">拍面特写</button>
      <button type="button" :class="{ on: labForceOn }" @click="toggleLabForce">🎯 击球受力</button>
    </footer>

    <footer v-else-if="modeId === 'balllab'" class="dock dock-thin">
      <button type="button" @click="toggleBallSpin">{{ ballData.spin ? '停止旋转' : '旋转' }}</button>
      <button type="button" @click="toggleCutaway">{{ ballData.cutaway ? '合并' : '剖面' }}</button>
      <button type="button" @click="scene?.setCamera('hero')">全景</button>
      <button type="button" @click="scene?.setCamera('close')">特写</button>
      <button type="button" @click="scene?.setCamera('top')">顶部</button>
      <button type="button" @click="scene?.setCamera('side')">侧视</button>
    </footer>

    <footer v-else-if="modeId === 'grip'" class="dock dock-thin">
      <button type="button" :class="{ on: gripData.spin }" @click="toggleGripSpin">{{ gripData.spin ? '停止旋转' : '旋转' }}</button>
      <button type="button" :class="{ on: gripData.compare }" @click="toggleGripCompare">{{ gripData.compare ? '单握特写' : '六握对比' }}</button>
      <template v-if="!gripData.compare">
        <button type="button" @click="scene?.setCamera('hero')">特写</button>
        <button type="button" @click="scene?.setCamera('butt')">柄端面</button>
        <button type="button" @click="scene?.setCamera('side')">侧视</button>
        <button type="button" @click="scene?.setCamera('top')">顶部</button>
      </template>
      <button v-else type="button" @click="scene?.setCamera('compare')">全景</button>
    </footer>

    <footer v-else-if="modeId === 'forehand' || modeId === 'backhand'" class="dock dock-thin">
      <button type="button" @click="toggleStroke">{{ strokePlaying ? '暂停' : '播放' }}</button>
      <button type="button" @click="toggleStrokeSlow">{{ strokeSlow ? '1.0×' : '0.25× 慢放' }}</button>
      <span class="hint-text">参数在画布下方滑块调节</span>
    </footer>

    <footer v-else-if="modeId === 'stance'" class="dock dock-thin">
      <button type="button" @click="toggleStance">{{ stancePlaying ? '暂停' : '播放' }}</button>
      <span class="hint-text">脚部几何随站位实时更新</span>
      <button type="button" @click="scene?.setCamera('top')">俯视</button>
      <button type="button" @click="scene?.setCamera('angle')">斜视</button>
      <button type="button" @click="scene?.setCamera('behind')">后视</button>
      <button type="button" @click="scene?.setCamera('front')">正面</button>
      <button type="button" @click="scene?.setCamera('side')">侧视</button>
    </footer>

    <footer v-else-if="modeId === 'footwork'" class="dock">
      <button type="button" @click="toggleFoot">{{ footPlaying ? '暂停' : '播放' }}</button>
      <button type="button" @click="replayFoot">重播</button>
      <input
        type="range"
        min="0"
        max="1000"
        :value="Math.round(footProgress * 1000)"
        aria-label="动作进度"
        @input="onFootScrub"
      />
      <span class="time">{{ footData.phase }}</span>
      <button type="button" :class="{ on: footSpeed === 0.4 }" @click="setFootSpeed(0.4)">0.4×</button>
      <button type="button" :class="{ on: footSpeed === 1 }" @click="setFootSpeed(1)">1×</button>
      <button type="button" :class="{ on: footView === '2d' }" @click="footView = '2d'">2D 俯视</button>
      <button type="button" :class="{ on: footView === '3d' }" @click="footView = '3d'; scene?.setCamera('angle')">3D 场景</button>
      <button type="button" :class="{ on: footMarksOn }" @click="toggleFootMarks">足印</button>
    </footer>

    <footer v-else-if="modeId === 'model'" class="dock">
      <button type="button" @click="toggleModel">{{ modelPlaying ? '暂停' : '播放' }}</button>
      <button type="button" @click="replayModel">重播</button>
      <span class="hint-text">参数在左侧数学模型图里调</span>
      <button type="button" @click="scene?.setCamera('elevation')">侧视</button>
      <button type="button" @click="scene?.setCamera('net')">过网</button>
      <button type="button" @click="scene?.setCamera('landing')">落点</button>
      <button type="button" @click="scene?.setCamera('top')">俯视</button>
    </footer>

    <footer v-else-if="modeId === 'serve'" class="dock">
      <button type="button" @click="toggleServe">{{ servePlaying ? '暂停' : '播放' }}</button>
      <button type="button" @click="replayServe">重播</button>
      <button type="button" @click="scene?.setCamera('side')">侧视</button>
      <button type="button" @click="scene?.setCamera('behind')">后视</button>
      <button type="button" @click="scene?.setCamera('top')">俯视</button>
      <button type="button" @click="scene?.setCamera('net')">过网</button>
      <button type="button" @click="scene?.setCamera('box')">落点</button>
      <button type="button" @click="scene?.setCamera('receive')">接发</button>
    </footer>

    <footer v-else-if="modeId === 'sliceserve'" class="dock slice-dock">
      <div class="slice-stages">
        <button
          v-for="(stage, index) in sliceStageNames"
          :key="stage"
          type="button"
          :class="{ on: sliceData.stageIdx === index }"
          @click="sliceJumpStage(index)"
        >{{ index + 1 }}. {{ stage }}</button>
      </div>
      <div class="slice-controls">
        <button type="button" @click="sliceStep(-1)">⏮</button>
        <button type="button" class="play" @click="toggleSlice">{{ sliceData.playing ? '⏸' : '▶' }}</button>
        <button type="button" @click="sliceStep(1)">⏭</button>
        <input
          class="slice-timeline"
          type="range"
          min="0"
          max="1"
          step="0.001"
          :value="sliceData.progress"
          @input="onSliceScrub"
        />
        <div class="slice-speed">
          <button
            v-for="s in [1, 0.5, 0.25, 0.1]"
            :key="s"
            type="button"
            :class="{ on: sliceData.speed === s }"
            @click="setSliceSpeed(s)"
          >{{ s }}x</button>
        </div>
      </div>
      <div class="slice-cams">
        <button v-for="cam in sliceCams" :key="cam.id" type="button" @click="scene?.setCamera(cam.id)">{{ cam.name }}</button>
      </div>
    </footer>

    <footer v-else-if="modeId === 'topspinserve'" class="dock slice-dock">
      <div class="slice-stages">
        <button
          v-for="(stage, index) in topspinStageNames"
          :key="stage"
          type="button"
          :class="{ on: topspinData.stageIdx === index }"
          @click="topspinJumpStage(index)"
        >{{ index + 1 }}. {{ stage }}</button>
      </div>
      <div class="slice-controls">
        <button type="button" @click="topspinStep(-1)">⏮</button>
        <button type="button" class="play" @click="toggleTopspin">{{ topspinData.playing ? '⏸' : '▶' }}</button>
        <button type="button" @click="topspinStep(1)">⏭</button>
        <input
          class="slice-timeline"
          type="range"
          min="0"
          max="1"
          step="0.001"
          :value="topspinData.progress"
          @input="onTopspinScrub"
        />
        <div class="slice-speed">
          <button
            v-for="s in [1, 0.5, 0.25, 0.1]"
            :key="s"
            type="button"
            :class="{ on: topspinData.speed === s }"
            @click="setTopspinSpeed(s)"
          >{{ s }}x</button>
        </div>
      </div>
      <div class="slice-cams">
        <button v-for="cam in topspinCams" :key="cam.id" type="button" @click="scene?.setCamera(cam.id)">{{ cam.name }}</button>
      </div>
    </footer>

    <footer v-else class="dock dock-thin">
      <button type="button" @click="scene?.setCamera('overview')">全景</button>
      <button type="button" @click="scene?.setCamera('side')">侧视</button>
      <button type="button" @click="scene?.setCamera('top')">俯视</button>
      <span class="hint-text">拖动旋转 · 滚轮缩放</span>
    </footer>

    <StrokeLab
      v-if="modeId === 'forehand' || modeId === 'backhand'"
      ref="strokeLabRef"
      :mode-tab="modeId === 'backhand' ? 'backhand' : 'forehand'"
      @stats="onStrokeStats"
    />

    <FootworkDemo
      v-if="modeId === 'footwork' && footView === '2d'"
      class="foot-demo-dock"
      :scenario-id="footData.id"
      :progress="footProgress"
      :show-footprints="footMarksOn"
      @jump="onFootJump"
    />

    <ServeMathPanel
      v-if="modeId === 'model'"
      @change="onModelChange"
    />

    <MatchArchive v-if="modeId === 'matches'" />

    <p class="disclaimer">本模块为科普与教学示意，动作参数与场地弹跳经简化，不替代专业教练指导。场地线按 ITF 尺寸。</p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import WorldMenu from '../components/WorldMenu.vue'
import ServeMathPanel from '../components/ServeMathPanel.vue'
import FootworkDemo from '../components/FootworkDemo.vue'
import StanceMap from '../components/StanceMap.vue'
import StrokeLab from '../components/StrokeLab.vue'
import ContactForceChart from '../components/ContactForceChart.vue'
import MatchArchive from '../components/MatchArchive.vue'
import BallBounceChart from '../components/BallBounceChart.vue'
import { MODES, SHOTS, shotById } from '../tennis/catalog.js'
import { SURFACES } from '../tennis/court.js'
import { TIMELINE, CHINA } from '../tennis/history.js'
import { QUIZ } from '../tennis/quiz.js'
import { RULES, emptyScore, nextScore } from '../tennis/rules.js'
import { TennisStage } from '../tennis/stage.js'
import { LabMode } from '../tennis/modes/LabMode.js'
import { FootworkMode } from '../tennis/modes/FootworkMode.js'
import { StanceMode } from '../tennis/modes/StanceMode.js'
import { StrokeBackdropMode } from '../tennis/modes/StrokeBackdropMode.js'
import { BallLabMode } from '../tennis/modes/BallLabMode.js'
import { GripMode } from '../tennis/modes/GripMode.js'
import { BALL_TYPES, BRANDS, ITF_SPEC, STRUCTURE_LAYERS, ballTypeById, brandById } from '../tennis/ballspec.js'
import { GRIP_LIST, GRIP_INTRO, gripById } from '../tennis/gripguide.js'
import { STANCES, STANCE_TIPS } from '../tennis/stance.js'
import { CYCLE_PHASES, SCENARIOS, ZONES, footprintsUpTo, scenarioById, travelOf } from '../tennis/footwork.js'
import { ServeMode } from '../tennis/modes/ServeMode.js'
import { ServeModelMode } from '../tennis/modes/ServeModelMode.js'
import { SliceServeMode } from '../tennis/modes/SliceServeMode.js'
import { TopspinServeMode } from '../tennis/modes/TopspinServeMode.js'
import { GRIP_INFO, FORCE_POINTS } from '../tennis/topspinguide.js'
import { SpinMode } from '../tennis/modes/SpinMode.js'
import { CourtMode } from '../tennis/modes/CourtMode.js'
import { HistoryMode } from '../tennis/modes/HistoryMode.js'
import { GearMode } from '../tennis/modes/GearMode.js'
import { TrainMode } from '../tennis/modes/TrainMode.js'

const modes = MODES
const shots = SHOTS
const surfaceList = Object.keys(SURFACES)
const timeline = TIMELINE
const china = CHINA
const rules = RULES
const quiz = QUIZ

const canvasRef = ref(null)
const modeId = ref('lab')
const shotId = ref('forehand')
const progress = ref(0)
const playing = ref(true)
const speed = ref(1)
const phaseName = ref('准备引拍')
const surfaceId = ref('hard')
const scrubbing = ref(false)
const labNet = reactive({ hit: false, text: '' })
const labForceOn = ref(true)
const labMu = ref(0.55)
const labForce = reactive({
  vIn: 0,
  vRacket: 0,
  vOut: 0,
  vn: 0,
  vt: 0,
  fn: 0,
  fr: 0,
  f: 0,
  muNeed: 0,
  muMax: 0.55,
  rpmOut: 0,
  rpmSet: 0,
  slip: false,
  spinKind: 'topspin',
  contactMs: 4,
  note: ''
})
const splitVn = computed(() => {
  const total = labForce.vn + labForce.vt
  return total > 0.01 ? (labForce.vn / total) * 100 : 50
})
const splitFn = computed(() => {
  const total = labForce.fn + labForce.fr
  return total > 0.01 ? (labForce.fn / total) * 100 : 50
})
const spinData = reactive({ rpm: 2500, surfaceId: 'hard', showForces: true, lanes: [], surf: SURFACES.hard })

/**
 * 旋转科学里的「接触瞬间」对比：来球 60 km/h、拍头速度 110 km/h 全部相同，
 * 只有刷球方向与拍面角度不同 —— 摩擦方向翻转，出球旋向随之翻转。
 */
const spinContact = computed(() => {
  const rpm = spinData.rpm || 0
  const v = 110 / 3.6
  const inVel = [0, -0.8, -60 / 3.6]
  const mk = (id, label, color, brushDeg, tiltDeg, spin) => {
    const a = (brushDeg * Math.PI) / 180
    const t = (tiltDeg * Math.PI) / 180
    return {
      id,
      label,
      color,
      inVel,
      racketVel: [0, v * Math.sin(a), v * Math.cos(a)],
      normal: [0, Math.sin(t), Math.cos(t)],
      rpm: spin
    }
  }
  return [
    mk('top', '上旋 · 拍头由低往高刷', '#ff8a4c', 42, -7, rpm),
    mk('flat', '平击 · 平推穿过球心', '#f2fbf2', 8, 0, 0),
    mk('slice', '下旋 · 拍头由高往低切', '#5ec8ff', -22, 16, -rpm)
  ]
})
const servePlaying = ref(true)
const modelPlaying = ref(true)
const footScenarios = SCENARIOS
const stanceList = STANCES
const stanceTips = STANCE_TIPS
const stancePlaying = ref(true)
const strokePlaying = ref(true)
const strokeSlow = ref(false)
const strokeLabRef = ref(null)
const strokeFh = reactive({ speed: 135, rpm: 3450, netClear: 1.18, bounceAngle: 41.5 })
const strokeBh = reactive({ radius: 1.42, launch: 11.5, courtDist: 24.8, flightTime: 0.64 })
const ballTypes = BALL_TYPES
const ballBrands = BRANDS
const ballLayers = STRUCTURE_LAYERS
const gripList = GRIP_LIST
const gripIntro = GRIP_INTRO
const gripData = reactive({
  gripId: 'continental',
  name: '大陆式',
  en: 'CONTINENTAL',
  color: '#4ade80',
  strokes: '',
  points: [],
  pros: '',
  cons: '',
  tip: '',
  contact: '',
  bevel: 2,
  handRot: -45,
  twoHanded: false,
  palmNote: '',
  compare: false,
  spin: false
})
const ballData = reactive({
  typeId: 'pressurized',
  brandId: 'wilson',
  cutaway: false,
  spin: true,
  typeName: '有压球',
  brandName: 'Wilson',
  tag: '罐装 · 比赛用',
  desc: '',
  pros: '',
  cons: '',
  pressure: '',
  life: '',
  rebound: 145
})
const bounceItems = computed(() => BALL_TYPES.map((t) => ({
  id: t.id,
  short: t.name,
  note: t.pressure,
  hex: t.hex,
  rebound: t.rebound
})))
const brandNote = computed(() => brandById(ballData.brandId).note)
const stanceData = reactive({
  id: 'open',
  name: '开放式站位',
  en: 'Open Stance',
  badge: '',
  scene: '',
  logic: '',
  pros: '',
  cons: '',
  axisLabel: '',
  power: '',
  feet: {
    left: { x: -0.28, advance: 0.16, yaw: 10 },
    right: { x: 0.28, advance: -0.12, yaw: -10 }
  },
  weightShift: 0.25,
  hex: '#ccff00'
})
const footCycle = CYCLE_PHASES
const footZones = ZONES
const footPlaying = ref(true)
const footProgress = ref(0)
const footSpeed = ref(1)
const footMarksOn = ref(true)
const footView = ref('2d')
const footScenarioId = ref('baseline_rally')
const footData = reactive({
  id: 'baseline_rally',
  title: '',
  phase: '',
  footCue: '',
  stepType: 'ready'
})

const footScenario = computed(() => scenarioById(footScenarioId.value))
const footTravel = computed(() => travelOf(footScenario.value))
const footMarks = computed(() => footprintsUpTo(footScenario.value, footProgress.value).length)
const modelData = reactive({
  heightCm: 168,
  speedKmh: 140,
  v: 38.89,
  h0: 2.48,
  surfaceId: 'hard',
  near: null,
  far: null,
  custom: null
})

const serveData = reactive({
  id: 'flat',
  side: 'deuce',
  surfaceId: 'hard',
  name: '平击发球',
  en: 'FLAT',
  desc: '',
  points: [],
  inBox: true,
  summary: '',
  rows: []
})
const courtData = reactive({ surfaceId: 'hard', singles: false })
let sliceScrubbing = false
const sliceStageNames = ['准备站位', '偏侧抛球', '奖杯搔背', '3点钟切击', '随挥外窜']
const sliceCams = [
  { id: 'free', name: '自由' },
  { id: 'server', name: '发球者后方' },
  { id: 'receiver', name: '接发' },
  { id: 'contact', name: '击球特写' },
  { id: 'side', name: '侧视' },
  { id: 'top', name: '俯视' }
]
const sliceHelpers = reactive({ clock: true, ribbon: true, normal: true, vectors: true, trajectory: true })
const sliceData = reactive({
  stageIdx: 0,
  progress: 0,
  mode: 'slice',
  left: false,
  deuce: true,
  playing: true,
  speed: 0.5,
  info: null
})
let topspinScrubbing = false
const topspinStageNames = ['准备站位', '头顶抛球', '深蹲搔背', '7→12点刷球', '随挥急坠']
const topspinCams = [
  { id: 'free', name: '自由' },
  { id: 'server', name: '发球者后方' },
  { id: 'receiver', name: '接发' },
  { id: 'contact', name: '击球特写' },
  { id: 'side', name: '侧视' },
  { id: 'top', name: '俯视' },
  { id: 'grip', name: '握拍特写' }
]
const topspinHelpers = reactive({ clock: true, ribbon: true, normal: true, vectors: true, trajectory: true, brush: true, grip: false })
const topspinData = reactive({
  stageIdx: 0,
  progress: 0,
  mode: 'topspin',
  left: false,
  deuce: true,
  playing: true,
  speed: 0.5,
  grip: 'continental',
  info: null
})
const gripInfo = GRIP_INFO
const forcePoints = FORCE_POINTS
const historyData = reactive({ index: 6, item: TIMELINE[6], racketName: '木拍 · 1920s' })
const gearData = reactive({
  gear: { headArea: 100, weight: 300, balance: 33, pattern: [16, 19], tension: 53 },
  offset: 0,
  factor: 1,
  balanceNote: ''
})
const score = reactive(emptyScore())
const serveText = ref('')
const quizIndex = ref(0)
const picked = ref(null)
const correct = ref(0)
const finished = ref(false)

let scene = null

const current = computed(() => modes.find((item) => item.id === modeId.value) || modes[0])
const shot = computed(() => SHOTS.find((item) => item.id === shotId.value) || SHOTS[0])
const currentQuiz = computed(() => quiz[quizIndex.value])
const resultText = computed(() => {
  const rate = correct.value / quiz.length
  if (rate === 1) return '全对。规则和技术要点都记住了。'
  if (rate >= 0.7) return '大部分对了。再回技巧实验室和球场与规则看一遍细节。'
  if (rate >= 0.4) return '对了一半左右。建议先看计分演示和旋转对比。'
  return '先把技巧实验室的击球帧和球场规则的计分板过一遍再来。'
})

function surfaceName(id) {
  return SURFACES[id]?.name || id
}

function pointLabel(who) {
  const mine = score.points[who]
  const other = score.points[who === 'a' ? 'b' : 'a']
  if (score.tiebreak) return `${mine}`
  if (mine >= 3 && other >= 3) {
    if (score.advantage === who) return 'AD'
    return '40'
  }
  return ['0', '15', '30', '40'][Math.min(mine, 3)]
}

function chooseShot(id) {
  shotId.value = id
  if (scene instanceof LabMode) scene.setShot(id)
  playing.value = true
  if (scene instanceof LabMode) scene.setPlaying(true)
}

function toggleLabForce() {
  if (!(scene instanceof LabMode)) return
  labForceOn.value = scene.setForce(!scene.forceOn)
}

function setLabMu(mu) {
  labMu.value = mu
  if (scene instanceof LabMode) {
    scene.setStringMu(mu)
    scene.setForce(true)
    labForceOn.value = true
  }
}

function chooseMode(id) {
  modeId.value = id
  const next = createMode(id)
  scene = next
  wire(next)
  stage.load(next)
  if (next instanceof LabMode) next.reportNetInfo()
  syncPlaying()
}

function createMode(id) {
  if (id === 'serve') return new ServeMode(stage)
  if (id === 'sliceserve') return new SliceServeMode(stage)
  if (id === 'topspinserve') return new TopspinServeMode(stage)
  if (id === 'model') return new ServeModelMode(stage)
  if (id === 'footwork') return new FootworkMode(stage)
  if (id === 'stance') return new StanceMode(stage)
  if (id === 'forehand') return new StrokeBackdropMode(stage, 'forehand')
  if (id === 'backhand') return new StrokeBackdropMode(stage, 'backhand')
  if (id === 'balllab') return new BallLabMode(stage)
  if (id === 'grip') return new GripMode(stage)
  if (id === 'spin') return new SpinMode(stage)
  if (id === 'court') return new CourtMode(stage)
  if (id === 'matches') return new CourtMode(stage)
  if (id === 'history') return new HistoryMode(stage)
  if (id === 'gear') return new GearMode(stage)
  if (id === 'train') return new TrainMode(stage)
  return new LabMode(stage)
}

function wire(node) {
  if (!node) return
  if (node instanceof LabMode) {
    node.onFrame = ({ progress: value, playing: isPlaying, phase }) => {
      if (!scrubbing.value) progress.value = value
      playing.value = isPlaying
      if (phase) phaseName.value = phase
      shotId.value = node.shot.id
    }
    node.onNetChange = ({ hit, clear, landing }) => {
      labNet.hit = hit
      if (hit) {
        labNet.text = '过网高度不够，球会触网弹回'
      } else if (clear !== null && clear !== undefined) {
        const land = landing ? `，落点距底线约 ${Math.abs(11.885 - landing.z).toFixed(1)} 米` : ''
        labNet.text = `过网高度约 ${(0.914 + clear).toFixed(2)} 米${land}`
      } else {
        labNet.text = ''
      }
    }
    node.onForce = (data) => {
      Object.assign(labForce, data)
      labForceOn.value = node.forceOn
      labMu.value = data.muMax
    }
  }
  if (node instanceof GripMode) {
    node.onData = (data) => {
      Object.assign(gripData, data)
    }
  }
  if (node instanceof BallLabMode) {
    node.onData = (data) => {
      const type = ballTypeById(data.typeId)
      ballData.typeId = type.id
      ballData.typeName = type.name
      ballData.tag = type.tag
      ballData.desc = type.desc
      ballData.pros = type.pros
      ballData.cons = type.cons
      ballData.pressure = type.pressure
      ballData.life = type.life
      ballData.rebound = type.rebound
      ballData.brandId = data.brandId
      ballData.brandName = brandById(data.brandId).name
      ballData.cutaway = data.cutaway
      ballData.spin = node.spin
    }
  }
  if (node instanceof SliceServeMode) {
    node.onData = (data) => {
      sliceData.stageIdx = data.stageIdx
      if (!sliceScrubbing) sliceData.progress = data.progress
      if (data.mode !== undefined) sliceData.mode = data.mode
      if (data.left !== undefined) sliceData.left = data.left
      if (data.deuce !== undefined) sliceData.deuce = data.deuce
      if (data.playing !== undefined) sliceData.playing = data.playing
      if (data.speed !== undefined) sliceData.speed = data.speed
      if (data.info) sliceData.info = data.info
    }
  }
  if (node instanceof TopspinServeMode) {
    node.onData = (data) => {
      topspinData.stageIdx = data.stageIdx
      if (!topspinScrubbing) topspinData.progress = data.progress
      if (data.mode !== undefined) topspinData.mode = data.mode
      if (data.left !== undefined) topspinData.left = data.left
      if (data.deuce !== undefined) topspinData.deuce = data.deuce
      if (data.playing !== undefined) topspinData.playing = data.playing
      if (data.speed !== undefined) topspinData.speed = data.speed
      if (data.grip !== undefined) topspinData.grip = data.grip
      if (data.info) topspinData.info = data.info
    }
  }
  if (node instanceof StanceMode) {
    node.onData = (data) => {
      applyStanceData(data.id)
    }
  }
  if (node instanceof FootworkMode) {
    node.onProgress = ({ progress: value, phase, footCue, stepType }) => {
      footProgress.value = value
      footData.phase = phase || ''
      footData.footCue = footCue || ''
      footData.stepType = stepType || 'ready'
    }
    node.onData = (data) => {
      footData.id = data.id
      footData.title = data.title
      footScenarioId.value = data.id
      footProgress.value = 0
      footPlaying.value = true
    }
  }
  if (node instanceof ServeMode) {
    node.onData = (data) => {
      serveData.id = data.id
      serveData.side = data.side
      serveData.surfaceId = data.surfaceId
      serveData.name = data.name
      serveData.en = data.en
      serveData.desc = data.desc
      serveData.points = data.points
      serveData.inBox = data.inBox
      serveData.summary = data.summary
      serveData.rows = data.rows
    }
  }
  if (node instanceof ServeModelMode) {
    node.onData = (data) => {
      modelData.heightCm = data.heightCm
      modelData.speedKmh = data.speedKmh
      modelData.v = data.v
      modelData.h0 = data.h0
      modelData.surfaceId = data.surfaceId
      modelData.near = data.near
      modelData.far = data.far
      modelData.custom = data.custom
    }
  }
  if (node instanceof SpinMode) {
    node.onFrame = () => {}
    node.onData = (data) => {
      spinData.rpm = data.rpm
      spinData.surfaceId = data.surfaceId
      spinData.showForces = data.showForces
      spinData.lanes = data.lanes
      spinData.surf = data.surf
    }
  }
  if (node instanceof CourtMode) {
    node.onFrame = () => {}
    node.onData = (data) => {
      courtData.surfaceId = data.surfaceId
      courtData.singles = data.singles
    }
    node.onServe = (info) => {
      serveText.value = `第 ${info.index + 1} 个发球位：${info.side === 'deuce' ? '右半区（平分侧）' : '左半区（占先侧）'}，目标是斜对角发球区`
    }
  }
  if (node instanceof HistoryMode) {
    node.onData = (data) => {
      historyData.index = data.index
      historyData.item = data.item
      historyData.racketName = data.racketName
    }
  }
  if (node instanceof GearMode) {
    node.onData = (data) => {
      gearData.gear = data.gear
      gearData.offset = data.offset
      gearData.factor = data.factor
      gearData.balanceNote = data.balanceNote
    }
  }
}

let stage = null

function syncPlaying() {
  if (modeId.value === 'lab') scene?.setPlaying(playing.value)
}

function toggle() {
  playing.value = !playing.value
  scene?.setPlaying(playing.value)
}

function replay() {
  scene?.setProgress(0)
  playing.value = true
  scene?.setPlaying(true)
}

function setSpeed(value) {
  speed.value = value
  scene?.setSpeed(value)
}

function onScrub(event) {
  const value = Number(event.target.value) / 1000
  progress.value = value
  scene?.setProgress(value)
  playing.value = false
}

function setSurface(id) {
  surfaceId.value = id
  if (scene instanceof LabMode) scene.setSurface(id)
}

function onModelHeight(event) {
  if (scene instanceof ServeModelMode) scene.setHeight(Number(event.target.value))
}

/** 文档面板改动参数时，把同一套状态推给 3D 场景。 */
function onModelChange(state) {
  if (scene instanceof ServeModelMode) scene.apply(state)
}

function onModelSpeed(event) {
  if (scene instanceof ServeModelMode) scene.apply({ speedKmh: Number(event.target.value) })
}

function setModelSurface(id) {
  if (scene instanceof ServeModelMode) scene.setSurface(id)
  modelData.surfaceId = id
}

function toggleModel() {
  modelPlaying.value = !modelPlaying.value
  if (scene instanceof ServeModelMode) scene.setPlaying(modelPlaying.value)
}

function replayModel() {
  modelPlaying.value = true
  if (scene instanceof ServeModelMode) scene.replay()
}

function setBallType(id) {
  if (scene instanceof BallLabMode) scene.setType(id)
}

function setBallBrand(id) {
  if (scene instanceof BallLabMode) scene.setBrand(id)
}

function toggleCutaway() {
  if (scene instanceof BallLabMode) scene.setCutaway(!ballData.cutaway)
}

function toggleBallSpin() {
  if (scene instanceof BallLabMode) {
    scene.setSpin(!ballData.spin)
    ballData.spin = !ballData.spin
  }
}

// ---- 握拍图鉴 ----

function chooseGrip(id) {
  if (scene instanceof GripMode) scene.setGrip(id)
}

function toggleGripCompare() {
  if (scene instanceof GripMode) scene.setCompare(!gripData.compare)
}

function toggleGripSpin() {
  if (scene instanceof GripMode) {
    scene.setSpin(!gripData.spin)
    gripData.spin = !gripData.spin
  }
}

function onStrokeStats({ fh, bh }) {
  if (fh) {
    strokeFh.speed = fh.speed
    strokeFh.rpm = fh.rpm
    strokeFh.netClear = fh.netClear
    strokeFh.bounceAngle = fh.bounceAngle
  }
  if (bh) {
    strokeBh.radius = bh.radius
    strokeBh.launch = bh.launch
    strokeBh.courtDist = bh.courtDist
    strokeBh.flightTime = bh.flightTime
  }
}

function toggleStroke() {
  strokePlaying.value = !strokePlaying.value
  strokeLabRef.value?.setPlaying(strokePlaying.value)
}

function toggleStrokeSlow() {
  strokeSlow.value = !strokeSlow.value
  strokeLabRef.value?.setSlow(strokeSlow.value)
}

/** 把站位数据同步到面板（脚部几何给 StanceMap 用）。 */function applyStanceData(id) {
  const item = STANCES.find((s) => s.id === id) || STANCES[0]
  Object.assign(stanceData, item)
  stanceData.id = item.id
}

function chooseStance(id) {
  applyStanceData(id)
  if (scene instanceof StanceMode) scene.setStance(id)
}

function toggleStance() {
  stancePlaying.value = !stancePlaying.value
  if (scene instanceof StanceMode) scene.setPlaying(stancePlaying.value)
}

function chooseFootwork(id) {
  footScenarioId.value = id
  if (scene instanceof FootworkMode) scene.setScenario(id)
}

function toggleFoot() {
  footPlaying.value = !footPlaying.value
  if (scene instanceof FootworkMode) scene.setPlaying(footPlaying.value)
}

function replayFoot() {
  footPlaying.value = true
  footProgress.value = 0
  if (scene instanceof FootworkMode) {
    scene.playing = true
    scene.setProgress(0)
    scene.playing = true
  }
}

function onFootScrub(event) {
  const value = Number(event.target.value) / 1000
  footProgress.value = value
  footPlaying.value = false
  if (scene instanceof FootworkMode) scene.setProgress(value)
}

/** 2D 演示器点阶段或点画布跳转。 */
function onFootJump(value) {
  onFootScrub({ target: { value: String(Math.round(value * 1000)) } })
}

function toggleFootMarks() {
  footMarksOn.value = !footMarksOn.value
  if (scene instanceof FootworkMode) scene.setMarks(footMarksOn.value)
}

function setFootSpeed(value) {
  footSpeed.value = value
  if (scene instanceof FootworkMode) scene.setSpeed(value)
}

function setServe(id) {
  if (scene instanceof ServeMode) scene.setServe(id)
}

function setServeSide(side) {
  if (scene instanceof ServeMode) scene.setSide(side)
}

function setServeSurface(id) {
  if (scene instanceof ServeMode) scene.setSurface(id)
}

function toggleServe() {
  servePlaying.value = !servePlaying.value
  if (scene instanceof ServeMode) scene.setPlaying(servePlaying.value)
}

function replayServe() {
  servePlaying.value = true
  if (scene instanceof ServeMode) scene.replay()
}

// ---- 切削发球生物力学 ----
function setSliceKind(kind) {
  if (scene instanceof SliceServeMode) scene.setServeKind(kind)
}

function setSliceHand(left) {
  if (scene instanceof SliceServeMode) scene.setHandedness(left)
}

function setSliceSide(deuce) {
  if (scene instanceof SliceServeMode) scene.setCourtSide(deuce)
}

function sliceJumpStage(idx) {
  if (scene instanceof SliceServeMode) scene.jumpStage(idx)
}

function sliceJumpKeyframe(key) {
  if (scene instanceof SliceServeMode) scene.jumpKeyframe(key)
}

function toggleSlice() {
  if (scene instanceof SliceServeMode) scene.setPlaying(!sliceData.playing)
}

function sliceStep(dir) {
  if (scene instanceof SliceServeMode) scene.stepFrame(dir)
}

function onSliceScrub(event) {
  sliceScrubbing = true
  const value = Number(event.target.value)
  sliceData.progress = value
  if (scene instanceof SliceServeMode) {
    scene.setProgress(value)
    scene.setPlaying(false)
  }
  requestAnimationFrame(() => (sliceScrubbing = false))
}

function setSliceSpeed(speed) {
  sliceData.speed = speed
  if (scene instanceof SliceServeMode) scene.setSpeed(speed)
}

function sliceToggleHelper(type) {
  sliceHelpers[type] = !sliceHelpers[type]
  if (scene instanceof SliceServeMode) scene.toggleHelper(type)
}

// ---- 上旋发球实验室 ----
function setTopspinKind(kind) {
  if (scene instanceof TopspinServeMode) scene.setServeKind(kind)
}

function setTopspinHand(left) {
  if (scene instanceof TopspinServeMode) scene.setHandedness(left)
}

function setTopspinSide(deuce) {
  if (scene instanceof TopspinServeMode) scene.setCourtSide(deuce)
}

function topspinJumpStage(idx) {
  if (scene instanceof TopspinServeMode) scene.jumpStage(idx)
}

function topspinJumpKeyframe(key) {
  if (scene instanceof TopspinServeMode) scene.jumpKeyframe(key)
}

function toggleTopspin() {
  if (scene instanceof TopspinServeMode) scene.setPlaying(!topspinData.playing)
}

function topspinStep(dir) {
  if (scene instanceof TopspinServeMode) scene.stepFrame(dir)
}

function onTopspinScrub(event) {
  topspinScrubbing = true
  const value = Number(event.target.value)
  topspinData.progress = value
  if (scene instanceof TopspinServeMode) {
    scene.setProgress(value)
    scene.setPlaying(false)
  }
  requestAnimationFrame(() => (topspinScrubbing = false))
}

function setTopspinSpeed(speed) {
  topspinData.speed = speed
  if (scene instanceof TopspinServeMode) scene.setSpeed(speed)
}

function topspinToggleHelper(type) {
  topspinHelpers[type] = !topspinHelpers[type]
  if (scene instanceof TopspinServeMode) scene.toggleHelper(type)
}

function setTopspinGrip(kind) {
  if (scene instanceof TopspinServeMode) {
    scene.setGripKind(kind)
    if (kind && !topspinHelpers.grip) {
      topspinHelpers.grip = true
      scene.setGripVisible(true)
    }
  }
}

function toggleTopspinGripView() {
  topspinHelpers.grip = !topspinHelpers.grip
  if (scene instanceof TopspinServeMode) scene.setGripVisible(topspinHelpers.grip)
}

function setSpinSurface(id) {
  if (scene instanceof SpinMode) scene.setSurface(id)
}

function setCourtSurface(id) {
  if (scene instanceof CourtMode) scene.setSurface(id)
}

function onRpm(event) {
  const value = Number(event.target.value)
  if (scene instanceof SpinMode) scene.setRpm(value)
}

function toggleForces() {
  if (scene instanceof SpinMode) scene.toggleForces()
}

function setSingles(value) {
  if (scene instanceof CourtMode) scene.setSingles(value)
}

function nextServe() {
  if (scene instanceof CourtMode) {
    const next = (scene.serveIndex + 1) % 4
    scene.setServe(next)
  }
}

function scoreFor(who) {
  const result = nextScore(score, who)
  score.points = result.points
  score.games = result.games
  score.advantage = result.advantage ?? null
  score.tiebreak = result.tiebreak ?? false
  score.log = result.log
}

function scoreA() {
  scoreFor('a')
}

function scoreB() {
  scoreFor('b')
}

function resetScore() {
  const fresh = emptyScore()
  score.points = fresh.points
  score.games = fresh.games
  score.advantage = null
  score.tiebreak = false
  score.log = fresh.log
}

function selectYear(index) {
  if (scene instanceof HistoryMode) scene.select(index)
}

function onGear(key, event) {
  if (!(scene instanceof GearMode)) return
  scene.setGear({ [key]: Number(event.target.value) })
}

function setPattern(pattern) {
  if (scene instanceof GearMode) scene.setPattern(pattern)
}

function isPattern(a, b) {
  const gear = gearData.gear.pattern
  return gear[0] === a && gear[1] === b
}

function onOffset(event) {
  if (scene instanceof GearMode) scene.setOffset(Number(event.target.value) / 100)
}

function pick(index) {
  if (picked.value !== null) return
  picked.value = index
  if (index === currentQuiz.value.answer) correct.value += 1
}

function nextQuiz() {
  if (quizIndex.value + 1 >= quiz.length) {
    finished.value = true
    return
  }
  quizIndex.value += 1
  picked.value = null
}

function restartQuiz() {
  quizIndex.value = 0
  picked.value = null
  correct.value = 0
  finished.value = false
}

function landText(z) {
  const fromBaseline = Math.abs(11.885 - z)
  return `${fromBaseline.toFixed(1)} m`
}

function onKey(event) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (event.key === ' ') {
    if (modeId.value === 'lab') {
      event.preventDefault()
      toggle()
    } else if (modeId.value === 'sliceserve') {
      event.preventDefault()
      toggleSlice()
    } else if (modeId.value === 'topspinserve') {
      event.preventDefault()
      toggleTopspin()
    }
  } else if (modeId.value === 'sliceserve' && event.key === 'ArrowLeft') {
    event.preventDefault()
    sliceStep(-1)
  } else if (modeId.value === 'sliceserve' && event.key === 'ArrowRight') {
    event.preventDefault()
    sliceStep(1)
  } else if (modeId.value === 'topspinserve' && event.key === 'ArrowLeft') {
    event.preventDefault()
    topspinStep(-1)
  } else if (modeId.value === 'topspinserve' && event.key === 'ArrowRight') {
    event.preventDefault()
    topspinStep(1)
  }
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  stage = new TennisStage(canvasRef.value)
  const first = createMode('lab')
  scene = first
  wire(first)
  stage.load(first)
  first.reportNetInfo()
  if (reduced) {
    playing.value = false
    first.setPlaying(false)
  }
  window.addEventListener('keydown', onKey)
  if (import.meta.env.DEV) window.__tennis = first
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  stage?.dispose()
  stage = null
  scene = null
})
</script>

<style scoped>
.tennis {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #071719;
  color: #eff9f2;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.tennis-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.mode-panel,
.info-panel,
.dock,
.disclaimer {
  position: absolute;
  z-index: 2;
}

.kicker {
  color: #d8f34a;
  letter-spacing: 0.16em;
  font-size: 11px;
}

.mode-panel {
  top: 58px;
  left: 14px;
  width: 208px;
  max-height: calc(100% - 78px);
  overflow: auto;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: rgba(5, 25, 25, 0.86);
}

.mode-panel h1 {
  margin: 6px 0;
  font-size: 21px;
  letter-spacing: 0.08em;
}

.mode-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.mode-list button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 7px 9px;
  text-align: left;
}

.mode-name {
  font-size: 13px;
}

.mode-en {
  font-size: 9px;
  letter-spacing: 0.1em;
  opacity: 0.62;
}

.sub,
.note {
  margin: 0;
  color: #a9c4b6;
  font-size: 12px;
  line-height: 1.6;
}

.cfc-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 10px;
}

.lg-v { color: #eafff2; font-weight: 400; }
.lg-vn { color: #38bdf8; font-weight: 400; }
.lg-vt { color: #22d3ee; font-weight: 400; }
.lg-fn { color: #ef4444; font-weight: 400; }
.lg-fr { color: #facc15; font-weight: 400; }
.lg-om { color: #c084fc; font-weight: 400; }

button {
  border: 1px solid #46685a;
  background: #18352d;
  color: #fff;
  border-radius: 8px;
  padding: 7px 8px;
  cursor: pointer;
  font-size: 12px;
}

button.on,
button:hover {
  background: #d8f34a;
  color: #10241b;
  border-color: #d8f34a;
}

button:disabled {
  cursor: default;
}

.info-panel {
  top: 58px;
  right: 14px;
  width: 296px;
  max-height: calc(100% - 132px);
  overflow: auto;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: rgba(5, 25, 25, 0.88);
}

.info-panel h2 {
  margin: 6px 0 8px;
  font-size: 20px;
}

.info-panel h3 {
  margin: 12px 0 6px;
  font-size: 14px;
  color: #d8f34a;
}

.info-panel p,
.info-panel li {
  font-size: 13px;
  line-height: 1.7;
  color: #d5ebe0;
}

.phase {
  color: #d8f34a;
}

.warn {
  color: #ffb4a8;
}

ol {
  margin: 8px 0;
  padding-left: 1.2rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}

.shot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin: 8px 0;
}

.shot-grid button {
  padding: 6px 4px;
  font-size: 12px;
}

.chip {
  padding: 5px 9px;
  font-size: 11px;
}

.net {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.18);
  color: #b8f5c8;
  font-size: 12px;
}

.net.hit {
  background: rgba(245, 158, 11, 0.2);
  color: #ffd79a;
}

/* 击球瞬间受力卡 */
.force-card {
  margin: 10px 0 6px;
  padding: 10px 11px;
  border: 1px solid rgba(216, 243, 74, 0.26);
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(216, 243, 74, 0.08), rgba(5, 25, 25, 0.32));
}

.force-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.force-head b {
  font-size: 13px;
  color: #d8f34a;
}

.force-head span {
  font-size: 11px;
  color: #9fbcae;
}

.force-line {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #d5ebe0;
}

.force-line b {
  font-size: 14px;
  color: #ffffff;
}

.force-line em {
  font-style: normal;
  font-size: 10px;
  color: #9fbcae;
}

.force-line .side {
  margin-left: auto;
  font-size: 10px;
  color: #9fbcae;
}

.force-line .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #eafff2;
}

.split,
.force-split {
  display: flex;
  height: 6px;
  margin: 7px 0 4px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.split i,
.force-split i {
  display: block;
  height: 100%;
}

.split .vn { background: #38bdf8; }
.split .vt { background: #22d3ee; }
.force-split .fn { background: #ef4444; }
.force-split .fr { background: #facc15; }

.force-legend {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #b9d4c7;
}

.force-legend i {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  margin-right: 4px;
}

.force-nums {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin: 9px 0 6px;
}

.force-nums div {
  padding: 6px 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  text-align: center;
}

.force-nums b {
  display: block;
  font-size: 13px;
  color: #f2fbf2;
}

.force-nums span {
  font-size: 10px;
  color: #9fbcae;
}

.force-note {
  margin: 6px 0 4px;
  font-size: 11.5px;
  line-height: 1.6;
  color: #cfe6d9;
}

.force-ok,
.force-slip {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
}

.force-ok { color: #8fe3ad; }
.force-slip { color: #ffd79a; }

.force-chips {
  margin: 8px 0 0;
  gap: 5px;
}

.force-chips .chip {
  font-size: 10.5px;
  padding: 4px 7px;
}

.slider {
  margin: 8px 0;
}

.slider label {
  display: block;
  font-size: 12px;
  color: #d8f34a;
  margin-bottom: 4px;
}

.slider input,
.dock input {
  width: 100%;
}

table.data {
  width: 100%;
  margin: 8px 0;
  border-collapse: collapse;
  font-size: 12px;
}

table.data th,
table.data td {
  padding: 4px 2px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

table.data th {
  color: #a9c4b6;
  font-weight: 500;
}

.formula {
  margin: 8px 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(216, 243, 74, 0.1);
  color: #eaff8a;
  font-family: "Cambria Math", "Times New Roman", serif;
  font-size: 13px;
  letter-spacing: 0.02em;
  text-align: center;
}

.serve {
  font-size: 12px;
  color: #d8f34a;
}

.score {
  margin: 10px 0;
  padding: 8px;
  border-radius: 10px;
  background: rgba(216, 243, 74, 0.08);
}

.score-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}

.score-row .who {
  width: 18px;
  color: #d8f34a;
}

.score-row .pts {
  width: 34px;
  font-weight: 600;
}

.score-row .games {
  width: 24px;
  opacity: 0.7;
}

.adv {
  color: #ffd79a;
  font-size: 12px;
}

.reset {
  width: 100%;
  margin-top: 6px;
}

.log {
  font-size: 12px;
  color: #a9c4b6;
  min-height: 2.4em;
}

.rules {
  margin: 6px 0;
  padding-left: 1.1rem;
}

.rules li {
  font-size: 12px;
  line-height: 1.65;
}

.rules li.hot {
  color: #d8f34a;
}

.rules li.hot b {
  color: #eaff8a;
}

.year {
  font-size: 28px;
  margin: 4px 0;
  color: #d8f34a;
  letter-spacing: 0.04em;
}

.timeline {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 10px 0;
}

.tick {
  padding: 4px 6px;
  font-size: 11px;
}

.quiz-index {
  color: #a9c4b6;
  font-size: 12px;
}

.quiz-q {
  font-size: 14px;
  color: #fff;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}

.quiz-options button {
  text-align: left;
  white-space: normal;
  line-height: 1.5;
}

.quiz-options button.right {
  background: #2f8f52;
  border-color: #2f8f52;
  color: #f4fff6;
}

.quiz-options button.wrong {
  background: #8f3a2f;
  border-color: #8f3a2f;
}

.why {
  font-size: 12px;
  color: #d8f34a;
}

.score-big {
  font-size: 34px;
  color: #d8f34a;
  margin: 8px 0;
}

.dock {
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  align-items: center;
  width: min(860px, calc(100% - 28px));
  padding: 9px 12px;
  border-radius: 16px;
  background: rgba(16, 45, 39, 0.9);
}

.dock-thin {
  width: min(520px, calc(100% - 28px));
}

.dock input {
  flex: 1 1 130px;
  min-width: 110px;
}

.height-range {
  flex: 0 1 150px;
  accent-color: #d8f34a;
}

.time {
  color: #d8f34a;
  font-size: 12px;
  min-width: 4.5em;
}

.hint-text {
  color: #a9c4b6;
  font-size: 11px;
}

.disclaimer {
  left: 14px;
  right: 14px;
  bottom: 8px;
  margin: 0;
  text-align: center;
  font-size: 11px;
  color: rgba(169, 196, 182, 0.9);
}

.foot-demo-dock {
  position: absolute;
  left: 232px;
  right: 322px;
  top: 58px;
  bottom: 92px;
  z-index: 3;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 22, 22, 0.94);
  backdrop-filter: blur(8px);
}

.foot-stats {
  display: flex;
  gap: 12px;
  margin: 8px 0;
}

.foot-stats div {
  display: flex;
  flex-direction: column;
}

.foot-stats dt {
  font-size: 10px;
  color: #8fa9a0;
}

.foot-stats dd {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #d8f34a;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.cycle {
  margin: 6px 0 10px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cycle li {
  display: flex;
  gap: 7px;
  align-items: flex-start;
}

.cycle i {
  flex: 0 0 auto;
  width: 17px;
  height: 17px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 800;
  font-style: normal;
  color: #10241b;
}

.cycle b {
  display: block;
  font-size: 11px;
  color: #e6f4ec;
}

.cycle span {
  display: block;
  font-size: 10px;
  line-height: 1.5;
  color: #8fa9a0;
  margin-top: 1px;
}

.zone-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left-width: 3px;
  background: rgba(255, 255, 255, 0.03);
}

.zone-card b {
  font-size: 11px;
  color: #f2fbf2;
}

.zone-range {
  font-size: 9px;
  color: #7f9a91;
}

.zone-desc {
  font-size: 10px;
  line-height: 1.5;
  color: #a9c4b6;
}

.zone-card ul {
  margin: 2px 0 0;
  padding-left: 11px;
  list-style: disc;
}

.zone-card li {
  font-size: 9.5px;
  line-height: 1.5;
  color: #8fa9a0;
}

.zone-foot {
  font-size: 9px;
  color: #6f8a81;
  margin-top: 2px;
}

.stance-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin: 8px 0;
}

.stance-tabs button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 5px 7px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #a9c4b6;
  cursor: pointer;
}

.stance-tabs button em {
  font-style: normal;
  font-size: 8.5px;
  color: #7f9a91;
  letter-spacing: 0.06em;
}

.stance-tabs button span {
  font-size: 10.5px;
  font-weight: 600;
}

.stance-tabs button.on {
  border-color: rgba(216, 243, 74, 0.6);
  background: rgba(216, 243, 74, 0.12);
  color: #eaff8a;
}

.stance-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 6px;
}

.stance-row b {
  font-size: 10px;
  color: #d8f34a;
}

.stance-row span {
  font-size: 10px;
  line-height: 1.55;
  color: #a9c4b6;
}

.stance-pros {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
}

.stance-pros div {
  padding: 5px 7px;
  border-radius: 8px;
  background: rgba(52, 211, 153, 0.07);
  border: 1px solid rgba(52, 211, 153, 0.22);
}

.stance-pros div.cons {
  background: rgba(255, 107, 90, 0.07);
  border-color: rgba(255, 107, 90, 0.22);
}

.stance-pros b {
  display: block;
  font-size: 9.5px;
  color: #6ee7b7;
  margin-bottom: 2px;
}

.stance-pros div.cons b {
  color: #ff9f92;
}

.stance-pros span {
  font-size: 9.5px;
  line-height: 1.5;
  color: #8fa9a0;
}

.stance-tip {
  padding: 6px 8px;
  border-radius: 9px;
  background: rgba(0, 240, 255, 0.07);
  border-left: 3px solid #00f0ff;
}

.stance-tip b {
  font-size: 9.5px;
  color: #7dd3fc;
}

.stance-tip p {
  margin: 2px 0 0;
  font-size: 9.5px;
  line-height: 1.55;
  color: #a9c4b6;
}

.ball-types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin: 8px 0;
}

.ball-types button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  padding: 5px 7px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #a9c4b6;
  cursor: pointer;
  position: relative;
  padding-left: 16px;
}

.ball-types button i {
  position: absolute;
  left: 6px;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.ball-types button span {
  font-size: 10.5px;
  font-weight: 600;
  color: #e6f4ec;
}

.ball-types button em {
  font-style: normal;
  font-size: 8.5px;
  color: #7f9a91;
}

.ball-types button.on {
  color: #eaff8a;
}

.ball-types button.on span {
  color: #eaff8a;
}

.ball-pros {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 7px 0;
}

.ball-pros div {
  padding: 5px 7px;
  border-radius: 8px;
  background: rgba(52, 211, 153, 0.07);
  border: 1px solid rgba(52, 211, 153, 0.22);
}

.ball-pros div.cons {
  background: rgba(255, 107, 90, 0.07);
  border-color: rgba(255, 107, 90, 0.22);
}

.ball-pros b {
  display: block;
  font-size: 9.5px;
  color: #6ee7b7;
  margin-bottom: 2px;
}

.ball-pros div.cons b {
  color: #ff9f92;
}

.ball-pros span {
  font-size: 9.5px;
  line-height: 1.5;
  color: #8fa9a0;
}

.brand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 5px 0;
}

.brand-grid button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 4px 6px 4px 16px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #a9c4b6;
  cursor: pointer;
  position: relative;
}

.brand-grid button i {
  position: absolute;
  left: 6px;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.brand-grid button span {
  font-size: 10px;
  font-weight: 600;
  color: #e6f4ec;
}

.brand-grid button em {
  font-style: normal;
  font-size: 8px;
  color: #7f9a91;
}

.brand-grid button.on {
  border-color: rgba(216, 243, 74, 0.55);
  background: rgba(216, 243, 74, 0.1);
}

.brand-grid button.on span {
  color: #eaff8a;
}

.layers {
  margin: 5px 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layers li {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}

.layers li i {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-top: 4px;
}

.layers li b {
  display: block;
  font-size: 10px;
  color: #e6f4ec;
}

.layers li span {
  display: block;
  font-size: 9px;
  line-height: 1.45;
  color: #8fa9a0;
  margin-top: 1px;
}

@media (max-width: 1320px) {
  /* 数学模型 / 脚步演示：面板已含读数，右侧面板只留大屏 */
  .model-panel,
  .foot-panel {
    display: none;
  }

  .foot-demo-dock {
    right: 14px;
  }
}

@media (max-width: 980px) {
  .info-panel {
    width: calc(100% - 28px);
    left: 14px;
    right: 14px;
    top: auto;
    bottom: 112px;
    max-height: 34%;
  }

  .mode-panel {
    width: min(190px, calc(100% - 28px));
  }

  .mode-name {
    font-size: 12px;
  }
}

/* ---- 切削发球生物力学 ---- */
.note.badge {
  display: inline-block;
  background: rgba(204, 255, 0, 0.14);
  color: #bef264;
  border: 1px solid rgba(204, 255, 0, 0.3);
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 600;
}
.stage-title {
  margin: 8px 0 6px;
  font-size: 15px;
  color: #f8fafc;
}
.mistake {
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.35);
  border-radius: 10px;
  padding: 9px 12px;
  margin: 10px 0;
  font-size: 12px;
}
.mistake b {
  color: #fda4af;
  display: block;
  margin-bottom: 4px;
}
.mistake p {
  margin: 0;
  color: rgba(254, 205, 211, 0.9);
  line-height: 1.6;
}
.shot-grid.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.helpers {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 10px 0;
  font-size: 12.5px;
  color: rgba(203, 213, 225, 0.92);
}

/* ---- 上旋发球：受力点与握拍 ---- */
.force-cards {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 10px 0;
}

.force-card {
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.force-card b {
  font-size: 12px;
}

.force-card p {
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: rgba(203, 213, 225, 0.82);
}

.grip-block {
  margin: 10px 0;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.grip-name {
  display: block;
  margin: 8px 0 4px;
  font-size: 12.5px;
  color: #bef264;
}

.grip-points {
  margin: 0 0 6px;
  padding-left: 18px;
  font-size: 11.5px;
  line-height: 1.65;
  color: rgba(203, 213, 225, 0.9);
}

.grip-points li {
  margin: 2px 0;
}
.helpers label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.helpers input {
  accent-color: #ccff00;
}
.slice-dock {
  max-width: 960px;
  left: 50%;
  transform: translateX(-50%);
  right: auto;
  flex-direction: column;
  gap: 8px;
}
.slice-stages,
.slice-controls,
.slice-cams {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.slice-stages button,
.slice-cams button {
  border: 1px solid rgba(56, 189, 248, 0.25);
  background: rgba(30, 41, 59, 0.85);
  color: rgba(226, 232, 240, 0.85);
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
}
.slice-stages button.on {
  background: rgba(204, 255, 0, 0.85);
  color: #0f172a;
  border-color: rgba(204, 255, 0, 0.8);
  font-weight: 600;
}
.slice-controls button {
  border: 1px solid rgba(56, 189, 248, 0.25);
  background: rgba(30, 41, 59, 0.85);
  color: rgba(226, 232, 240, 0.85);
  border-radius: 8px;
  padding: 5px 10px;
  cursor: pointer;
}
.slice-controls .play {
  background: rgba(56, 189, 248, 0.85);
  color: #0f172a;
  font-weight: 700;
  min-width: 40px;
}
.slice-timeline {
  flex: 1;
  min-width: 180px;
  accent-color: #ccff00;
}
.slice-speed {
  display: flex;
  gap: 4px;
}
.slice-speed button {
  padding: 4px 8px;
  font-size: 11px;
}
.slice-speed button.on {
  background: rgba(56, 189, 248, 0.3);
  color: #7dd3fc;
  border-color: rgba(56, 189, 248, 0.6);
}
.slice-cams button.on {
  background: rgba(56, 189, 248, 0.25);
  color: #7dd3fc;
}
@media (max-width: 760px) {
  .slice-timeline {
    min-width: 110px;
  }
  .slice-cams button {
    padding: 4px 8px;
    font-size: 11px;
  }
}

/* ---- 握拍图鉴 ---- */
.grip-panel .sec-title {
  margin: 12px 0 4px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(216, 243, 74, 0.85);
}
.grip-panel .strokes {
  margin: 0;
  font-weight: 600;
  color: #eaff8a;
}
.grip-panel .points {
  margin: 4px 0 0;
  padding-left: 18px;
}
.grip-panel .points li {
  margin-bottom: 3px;
}
.grip-panel .palm {
  margin: 0;
  color: #fbbf77;
}
.grip-panel .pc {
  display: grid;
  gap: 6px;
  margin: 10px 0;
}
.grip-panel .pc > div {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(213, 235, 224, 0.92);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  padding: 7px 10px;
}
.grip-panel .pc > div b {
  display: block;
  margin-bottom: 2px;
  color: #7cf2b0;
  font-size: 11px;
}
.grip-panel .pc .cons b {
  color: #fda4af;
}
.grip-panel .tip {
  background: rgba(250, 204, 21, 0.08);
  border: 1px solid rgba(250, 204, 21, 0.3);
  border-radius: 10px;
  padding: 8px 11px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(254, 240, 199, 0.94);
  margin: 10px 0;
}
.grip-panel .tip b {
  display: block;
  margin-bottom: 3px;
  color: #fde047;
  font-size: 11px;
}
.grip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 12px 0 6px;
}
.grip-list .chip {
  font-size: 11.5px;
}
</style>
