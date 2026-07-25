# Game Art & Audio Provenance

- 날짜: 2026-07-22
- 게임: `crosspulse`
- 생성 도구: Codex built-in `image_gen` (`image_gen__imagegen`)
- 생성 세션 힌트: 로컬 생성 세션에서 제작했으며 저장소에는 재배포 가능한 원본과 프롬프트만 보존한다.

## 게임 아트

### 타이틀 키와 게임 질감

- 원본: `art/source/title-key-original.png`, 853×1844 PNG, SHA-256 `158e3cf0236ba18ca2c9d3959d8853571f970f7f75d66e0035c951179d0545ed`.
- 생성 출력: `exec-09298221-0eec-4799-bfc1-331124c8e645.png`.
- 사용본: `public/art/title-key.png`, 780×1688 PNG, SHA-256 `151607ac574d4f18a50a6e37936555da8a6f1fef0bac067935d827e3e8c748d7`.
- 후가공: `sips --resampleHeightWidth 1688 780`. 색·형태 합성은 하지 않았다.
- 사용 위치: 타이틀 CSS 배경, PixiJS 젤 리본 텍스처와 `DisplacementFilter` 입력. 생성 이미지를 완성 UI로 쓰지 않고 코드가 HUD·판정·변형을 그린다.
- 프롬프트:

```text
Use case: stylized-concept
Asset type: portrait mobile game title key image
Primary request: An abstract elastic-ribbon apparatus identified only by its visual mechanics: a descending crimson dye droplet and a rising white compression wave are about to collide exactly inside a bright white horizontal safety band.
Scene/backdrop: deep near-black plum chamber, no place or story setting.
Subject: one tall translucent milky gel ribbon, one internal crimson dye droplet above, one luminous compression ring rising from a dark lower vibration plate, symmetric tension around the meeting point.
Style/medium: premium tactile game key art, physically rich translucent gel, refractive WebGL-like surface, subtle film grain and generated microtexture, crisp mobile-game readability.
Composition/framing: 390×844 portrait composition, central vertical apparatus, generous dark negative space in upper quarter for code-rendered title, lower vibration plate visible, strong central focal point.
Lighting/mood: restrained, lucid, tense; white internal glow, crimson refraction, tiny orange warning glints.
Color palette: milky ivory gel, deep oxblood and crimson dye, pure white band, limited ember orange, black-plum background.
Materials/textures: wet elastic gel with believable thickness, internal caustics, compression ripples, fine suspended dye grain.
Constraints: no people, characters, scenery, collectibles, icons, logos, text, letters, watermark, flat vector shapes, or generic gradient-only background; keep visual mechanics physically legible.
```

### 목표 화면

모든 원본은 853×1844 PNG다. `sips --resampleHeightWidth 844 390`으로 390×844에 맞췄다. `design/targets/`가 구현 기준이며 `verification/targets/` 중복본은 제거했다.

| 화면 | 원본 SHA-256 | 최종 SHA-256 |
|---|---|---|
| first-play | `49ec823a857c2c2ca8d28d906b38881b4141784c0db316a33f9695dffa50e5be` | `66566566dafd49601b92cb6c04d27d5fc8df101ab492c494c2e070292bf07539` |
| verb-precision | `e199975c90f8eee0ceababa4edc7514a9e4c8588bfa28227ba288f5ffd39e1ed` | `b4f912dd88e81b0101683f535a74782842c22fb707097aca296eb08e4253091f` |
| verb-success | `8ac2be08e8247a4a00a5e2c87f1546e6e7edf0223bb9c4dcb43baea7c75f99da` | `16393ce4b325df976eae4047222eecdd1a3309d22c10552262393b1e12ac2c2e` |
| verb-failure | `847a7b570f4c22dbd484d96bfd29cb0e01294b073983d8c3d96d8641827704e3` | `3193d7de2448fb89fa9e939077e5c3f341a1674f8b908f99428a4c3b18e251eb` |
| game-over | `8c3d50756b675d364fe1eec1b734a2bf7372d09e71af7e4759ceb72a9e7497cb` | `60bbc9298928eddcc7c448398c6c37b45ec47b83c8a16070d3e8de154226b51c` |

공통 프롬프트 골격은 다음과 같고 각 장면에 아래 상태 문장을 붙였다.

```text
Use case: ui-mockup
Asset type: finished 390×844 portrait mobile game target screen
Scene/backdrop: deep black-plum field with a central translucent milky elastic gel ribbon.
Style/medium: shippable premium mobile gameplay mockup, refractive WebGL-like deformation, tactile translucent gel and generated microtexture.
Color palette: milky ivory, crimson, white, ember orange only for warning, black-plum.
Constraints: exact portrait 390×844; render requested text verbatim once and legibly; no joystick, aim reticle, characters, scenery, collectibles, extra buttons, logos, watermark, flat vector shapes, or gradient-only design.
```

- `first-play`: descending crimson droplet, white safety band and center line, visible predicted-collision marker, lower vibration plate. HUD `PRECISE 0/12`, `RUPTURE 0/3`, `1/12`; guide `TAP → WAVE`, `WHEN MARKER MEETS WHITE`, `12 DROPS · 3 RUPTURES END`.
- `verb-precision`: exact meeting on the center line, symmetric white double bloom, mirrored fragments, compressed lower gel and paired rings. HUD `PRECISE 6/12`, `RUPTURE 0/3`, `7/12`; `PRECISE`, `Δ +02`.
- `verb-success`: off-center collision inside the band, unequal dye lobes, asymmetric bend and one resonance ring. HUD `PRECISE 5/12`, `RUPTURE 0/3`, `6/12`; `HIT`, `Δ +31`.
- `verb-failure`: late low collision, vertical dye tear below the band, pinched gel and ember stress seams. HUD `PRECISE 4/12`, `RUPTURE 2/3`, `8/12`; `TOO LATE · LOW COLLISION`, `Δ +63`.
- `game-over`: calm gel with one final full-ribbon ring; embedded result `END`, `PRECISE 9/12 · RUPTURE 1/3`, `NEXT: TAP A LITTLE EARLIER`, `TAP SCREEN TO RESTART`; no modal/card.

## 절차 그래픽과 셰이더

- `src/game/CrosspulseGame.ts`가 생성 키 이미지를 WebGL 텍스처로 읽고, 64×128 코드 생성 변위 맵과 tick 기반 `DisplacementFilter`로 젤 굴절을 만든다.
- 방울, 파동, 안전 띠, 진동판, 파열 조각은 PixiJS `Graphics`로 그린다. 파편 위치는 판정 이벤트의 고정 seed에서 파생한다.
- 판정에는 셰이더·파티클이 관여하지 않는다.

## 게임 사운드

- 외부 음원 없음.
- `src/game/crosspulse/CrosspulseAudio.ts`가 Web Audio 오실레이터·게인으로 입력, 정밀(높은 두 음), 성공(중간 한 음), 실패(낮은 파열음)를 합성한다.
- 첫 사용자 입력 전에는 AudioContext를 만들지 않는다. 음소거·pause·resume·재시작 경로에서 같은 컨트롤을 사용한다.

## 공개 제작자 일러스트 부록

- 기준: `laika-base-v1`을 직접 참조한 Codex built-in `image_gen` 편집.
- 대표 행동: 라이카가 한 앞발로 교차파 장치의 하단 진동판을 누르고, 원통 안의 붉은 방울과 흰 압축파가 중앙 띠에서 만난다.
- 원본: `art/source/laika-crosspulse.png`, 1537×1023, SHA-256 `797dceff5d7007f945ebad33626c31e4732ed865f1b2959a638ac76d4a9a28fc`.
- 웹 파생본: `public/art/laika-crosspulse-640.jpg` 640×426, `public/art/laika-crosspulse-1280.jpg` 1280×852.
- 프롬프트: `art/prompts/laika-crosspulse.md`.
- 생성 경로·해시·검수: `art/provenance/laika-crosspulse.json`.
- 검수: 좁은 흰 이마선, 어두운 눈가, 흰 가슴·앞발, 크림 X 하네스, 주황 연결구, 네 발 골격을 확인했다. 생성 문자·여분의 발·사람 손은 없다. 게임 아트에는 이 캡슐·지구·팔레트를 되돌려 넣지 않았다.

## 공개용 라이카 일러스트

- 캐릭터 기준: `laika-base-v1`
- 베이스 SHA-256: `820e6d43e915c4e9e32ddcd3cc14d0f2537d99f6d8d397bbd40fc416137a6712`
- 생성 원본: `art/source/laika-crosspulse.png`
- 재현용 아트 디렉션: `art/prompts/laika-crosspulse.md`
- 해시와 검수: `art/provenance/laika-crosspulse.json`
- 웹 카드: `public/art/laika-crosspulse-640.jpg`
- 웹 상세: `public/art/laika-crosspulse-1280.jpg`

잠긴 대표 행동과 도구만 가져온다. 베이스 그림의 캡슐, 창, 지구, 팔레트를 게임 UI나 플레이 아트에 반영하지 않는다. 얼굴 무늬, 귀, 하네스, 주황 연결구, 발의 골격, 생성 문자, 모바일 크롭을 확인한다.
