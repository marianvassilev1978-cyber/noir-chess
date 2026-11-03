module.exports = async (t) => {
  // lesson: go to forks lesson and step to first exercise
  await t.go("index.html#/lesson/l4-forks"); await t.wait(1500);
  for (let i = 0; i < 6; i++) {
    const ty = await t.eval(`document.querySelector('.lb').classList.contains('hide') ? 'text' : (document.querySelector('.hint') ? 'ex' : 'board')`);
    if (ty === "ex") break;
    await t.click(".nextb"); await t.wait(400);
  }
  await t.shot("20-lesson-ex");
  // puzzles
  await t.go("index.html#/puzzle/rated"); await t.wait(3000); await t.shot("21-puzzle");
  // opening learn
  await t.go("index.html#/opening/vienna"); await t.wait(1200); await t.shot("22-opening");
  await t.eval(`document.querySelector('.lesson-row').click()`); await t.wait(400);
  await t.click(".learn"); await t.wait(600);
  await t.click(".fw"); await t.wait(500); await t.click(".fw"); await t.wait(500); await t.click(".fw"); await t.wait(500);
  await t.shot("23-opening-learn");
  // analysis
  await t.go("index.html#/analysis"); await t.wait(3000);
  await t.move("e2", "e4", "w", "#abd"); await t.wait(2500);
  await t.shot("24-analysis");
  // endgames, vision, plan, library
  await t.go("index.html#/plan"); await t.wait(1200); await t.shot("25-plan");
  await t.go("index.html#/library"); await t.wait(1200); await t.shot("26-library");
  await t.go("index.html#/vision"); await t.wait(800); await t.shot("27-vision");
  await t.go("index.html#/rush"); await t.wait(800); await t.click("[data-k=r3]"); await t.wait(2500); await t.shot("28-rush");
  // premove test: vs Pip, play e4 then premove d4 immediately
  await t.go("index.html#/play"); await t.wait(800);
  await t.eval(`document.querySelector('.grp-chips .chip[data-g="beginner"]').click()`);
  await t.eval(`document.querySelector('.bot[data-id="pip"]').click()`);
  await t.eval(`document.querySelector('.tc-btn[data-tc="3+0"]').click()`);
  await t.eval(`document.querySelector('.colors button[data-c="w"]').click()`);
  await t.click(".start"); await t.wait(1200);
  await t.move("e2", "e4", "w", "#bd"); await t.wait(100);
  await t.move("d2", "d4", "w", "#bd"); await t.wait(4000);
  console.log("premove moves:", await t.eval("document.querySelector('#ml').textContent"));
  await t.shot("29-premove");
};
