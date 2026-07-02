const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let p=0,f=0;
  function ck(n,c,d=""){if(c){console.log("  OK "+n);p++;}else{console.log("  FAIL "+n+" "+d);f++;}}
  try {
    console.log("Step 1: Login");
    await page.goto("http://localhost:4000/login",{waitUntil:"networkidle",timeout:15000});
    ck("Login page",page.url().includes("login"));
    const e=page.locator("input[type=email],input[placeholder*=youxiang],input[name=email]").first();
    const w=page.locator("input[type=password]").first();
    await e.fill("testbot@test.com");
    await w.fill("Test1234!");
    const b=page.locator("button[type=submit]").first();
    await b.click();
    await page.waitForURL("**/dashboard**",{timeout:10000}).catch(()=>console.log("WARN:no redirect"));
    console.log("Step 2: Vibe page");
    await page.goto("http://localhost:4000/dashboard/vibe",{waitUntil:"networkidle",timeout:15000});
    await page.waitForTimeout(3000);
    ck("Vibe page",page.url().includes("vibe"));
    await page.screenshot({path:"D:\\\\atmoW\\\\sAgent\\\\test-screenshot.png"});
    console.log("Step 3: Check phases");
    ck("P1",(await page.locator("text="\u57fa\u7840\u592f\u5b9e"").count())>0);
    ck("P2",(await page.locator("text="\u8fdb\u9636\u7a81\u7834"").count())>0);
    ck("P3",(await page.locator("text="\u6846\u67b6\u5b9e\u6218"").count())>0);
    ck("P4",(await page.locator("text="\u5de5\u7a0b\u89c4\u8303"").count())>0);
    ck("P5",(await page.locator("text="\u7cbe\u901a\u638c\u63e1"").count())>0);
    console.log("Step 4: Check nodes");
    ck("JS-001",(await page.locator("text=JS-001").count())>0);
    ck("NODE-001",(await page.locator("text=NODE-001").count())>0);
    ck("FE-001",(await page.locator("text=FE-001").count())>0);
    ck("REACT-001",(await page.locator("text=REACT-001").count())>0);
    ck("ENG-001",(await page.locator("text=ENG-001").count())>0);
    ck("AI-001",(await page.locator("text=AI-001").count())>0);
    console.log("Step 5: Sidebar text");
    const sb=page.locator("aside").first();
    if(await sb.count()>0){
      const t=await sb.textContent();
      ["JS-001","NODE-001","FE-001","REACT-001","ENG-001","AI-001"].forEach(k=>ck("has "+k,t.includes(k)));
    }else{ck("sidebar",false);}
  }catch(e){console.error("ERR:",e.message);f++;}
  finally{await browser.close();}
  console.log("\nOK="+p+" FAIL="+f+" Total="+(p+f));
  process.exit(f>0?1:0);
})();
