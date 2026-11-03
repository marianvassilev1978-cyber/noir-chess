module.exports = async (t) => {
  await t.go("index.html#/play");
  await t.wait(1500);
  // practice vs Ravi (900), white, unlimited
  await t.eval(`(()=>{document.querySelector('.grp-chips .chip[data-g="novice"]').click();})()`);
  await t.wait(100);
  await t.eval(`document.querySelector('.bot[data-id="ravi"]').click()`);
  await t.eval(`document.querySelector('.tc-btn[data-tc="5+3"]').click()`);
  await t.eval(`document.querySelector('.colors button[data-c="w"]').click()`);
  await t.eval(`document.querySelector('.modes button[data-r="0"]').click()`);
  await t.click(".start");
  await t.wait(1500);
  await t.shot("10-game-start");
  const play = async (f, to) => { await t.move(f, to, "w", "#bd"); await t.wait(3500); };
  await play("e2", "e4");
  await play("g1", "f3");
  await play("f1", "c4");
  await t.shot("11-game-mid");
  console.log("moves:", await t.eval("document.querySelector('#ml').textContent"));
  console.log("coach:", await t.eval("(document.querySelector('.coach-area')||{}).textContent"));
  await play("d2", "d4");
  await play("e1", "g1");
  await t.shot("12-game-later");
  console.log("moves:", await t.eval("document.querySelector('#ml').textContent"));
  // resign
  await t.click("#b-resign");
  await t.wait(500);
  await t.click(".sheet .o");
  await t.wait(1200);
  await t.shot("13-result");
  await t.click(".r-review");
  await t.wait(25000);
  await t.shot("14-review-summary");
  await t.click(".go-moves");
  await t.wait(800);
  await t.shot("15-review-moves");
};
