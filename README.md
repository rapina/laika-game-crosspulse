# 교차파 / Crosspulse

내려오는 방울과 올라가는 파동을 흰 띠에서 교차시킨다.

Cross a falling droplet and a rising wave inside the white band.

- 플레이 / Play: https://laika365.vercel.app/play/crosspulse
- 작품 노트 / Notes: https://laika365.vercel.app/games/crosspulse

## 한국어

예측점이 흰 중앙선에 닿을 때 탭해 압축파를 보낸다. 방울 12개를 판정하면 끝나며 파열 3회면 즉시 종료된다.

### 조작

화면을 탭해 하단 진동판에서 압축파를 보낸다. Space 또는 Enter로 같은 압축파를 보낸다. 결과 화면을 눌러 다시 시작한다.

## English

Tap when the prediction marker reaches the white center line to send a compression wave. Judge 12 droplets; three ruptures end the run immediately.

### Controls

Tap the screen to send a compression wave from the lower plate. Space or Enter sends the same compression wave. Tap the result screen to start again.

## 로컬 실행 / Run locally

```bash
git clone https://github.com/rapina/laika-game-crosspulse.git
cd laika-game-crosspulse
npm ci
npm run dev
```

### 검증 / Verification

```bash
npm run dev
npm run test
npm run build
npm run smoke
npm run build:arcade
```

게임의 설계·검증 기록은 `GDD.md`, `DAY.md`, `ART.md`에 있습니다.  
Design and verification records live in `GDD.md`, `DAY.md`, and `ART.md`.

## 라이선스 / License

- 코드 / Code: [MIT](LICENSE)
- 문서와 비브랜드 원본 아트 / Documentation and original non-brand artwork: [CC BY 4.0](CONTENT-LICENSE.md)
- Laika 및 Sputnik Workshop 브랜드 자산 / Laika and Sputnik Workshop brand assets: 별도 허가 필요 / separate permission required
- 제3자 자료 / Third-party material: 원래 라이선스 유지 / remains under its original license
