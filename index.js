const Discord = require("discord.js");
const Client = new Discord.Client();
const fs = require("fs");
const request = require("request");
const {Builder, By} = require("selenium-webdriver");
const Chrome = require("selenium-webdriver/chrome");
const Prefix = "&";
var currentlyUsing = false;
var CDriver;
const beforeReady = new Date();

console.log("Loading Bot...");

Client.on("ready", async function() {
    console.log("Initializing ChromeDriver...");
    CDriver = await new Builder().forBrowser("chrome").setChromeOptions(new Chrome.Options().addArguments("headless", "disable-gpu")).build();
    console.log("Loading CultureLand...");
    const data = await readData();
    await CDriver.get("https://m.cultureland.co.kr/csh/cshGiftCard.do");
    await CDriver.manage().addCookie({name: "KeepLoginConfig", value: data["AccountSecretKey"]});
    await CDriver.navigate().refresh();
    console.log("Ready! (Took " + (new Date() - beforeReady) + "ms)");
});

Client.on("message", async function(message) {
    if (message.content.toLowerCase() === Prefix + "help") {
        await message.channel.send(new Discord.MessageEmbed()
            .setTitle("❗ 명령어 목록")
            .addField(Prefix + "help", "명령어 목록을 보여줍니다")
            .addField(Prefix + "충전 [문-상-코-드]", "상품권을 충전합니다")
            .addField(Prefix + "돈추가 [@유저] [금액]", "[금액] 원을 [@유저] 의 돈에 추가합니다")
            .addField(Prefix + "구매(purchase) [번호] [개수]", "[번호] 번째 상품을 [개수] 개 구매합니다")
            .addField(Prefix + "상품", "상품 목록을 보여줍니다")
            .addField(Prefix + "상품생성 [이름]", "[이름] 상품을 생성합니다")
            .addField(Prefix + "상품수정 [번호] [새이름]", "[번호] 번째 상품을 수정합니다")
            .addField(Prefix + "상품삭제 [번호]", "[번호] 번째 상품을 삭제합니다")
            .addField(Prefix + "재고추가 [번호] [첨부파일]", "[번호] 번째 상품에 [첨부파일] 재고를 추가합니다")
            .addField(Prefix + "정보 (@유저)", "유저 (@유저) 의 정보를 보여줍니다")
            .addField(Prefix + "가입", "봇에 가입합니다")
            .addField(Prefix + "경고 [@유저] [메시지]", "[@유저] 를 [메시지] 메시지로 경고합니다")
            .addField(Prefix + "경고전체삭제 [@유저]", "[@유저] 의 경고를 모두 삭제합니다")
            .addField(Prefix + "경고삭제 [@유저] [번째]", "[@유저] 의 [번째] 번째 경고를 삭제합니다")
            .setColor(0x00FFFF));
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "charge ")) {
        if (currentlyUsing) {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❗ 다른 유저가 사용중입니다!")
                .setColor(0x00FFFF));
            return;
        }
        try {
            currentlyUsing = true;
            const PinCode = message.content.split(" ")[1].split("-");
            if (isNaN(PinCode.join("")) || PinCode.join("").length != 18 || !(PinCode[0].startsWith("2") || PinCode[0].startsWith("3") || PinCode[0].startsWith("4") || PinCode[0].startsWith("5"))) {
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❗ 존재하지 않는 상품권입니다!")
                    .setColor(0x00FFFF));
                currentlyUsing = false;
                return;
            }
            const ReplyMessage = await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❗ 충전중입니다!")
                .setColor(0x00FFFF));
            await CDriver.navigate().refresh();
            if (await CDriver.getCurrentUrl() !== "https://m.cultureland.co.kr/csh/cshGiftCard.do") {
                await CDriver.navigate().to("https://m.cultureland.co.kr/csh/cshGiftCard.do");
                while (await CDriver.getCurrentUrl() !== "https://m.cultureland.co.kr/csh/cshGiftCard.do") {
                    await CDriver.getCurrentUrl()
                        .then(async function(URL) { if (URL.startsWith("https://m.cultureland.co.kr/mmb/loginMain.do")) await CDriver.navigate().refresh(); });
                    await sleep(100);
                }
            }
            var TimeDelayed = new Date();
            const PinBox1 = CDriver.findElement(By.id("txtScr11"));
            const PinBox2 = CDriver.findElement(By.id("txtScr12"));
            const PinBox3 = CDriver.findElement(By.id("txtScr13"));
            const PinBox4 = CDriver.findElement(By.id("txtScr14"));
            await PinBox1.click();
            await PinBox1.sendKeys(PinCode[0]);
            await PinBox2.click();
            await PinBox2.sendKeys(PinCode[1]);
            await PinBox3.click();
            await PinBox3.sendKeys(PinCode[2]);
            await PinBox4.click();
            for (let i = 0; i < PinCode[3].length; i++) await CDriver.findElement(By.xpath("//*[@alt='" + PinCode[3].charAt(i) + "']")).click();
            await CDriver.findElement(By.id("btnCshFrom")).click();
            while (await CDriver.getCurrentUrl() !== "https://m.cultureland.co.kr/csh/cshGiftCardCfrm.do") await sleep(10);
            const ChargeState = await CDriver.findElement(By.xpath("//*[@id='wrap']/div[3]/section/div/table/tbody/tr/td[3]/b")).getText();
            const ChargeMoney = await CDriver.findElement(By.xpath("//*[@id='wrap']/div[3]/section/dl/dd")).getText();
            TimeDelayed = new Date() - TimeDelayed;
            var data = await readData();
            const UserId = message.author.id;
            if (ChargeState === "충전 완료") {
                if (data["UserData"][UserId] === undefined) data["UserData"][UserId] = {SucceedCount: 1, FailedCount: 0, Money: 0, Warnings: "없음"};
                else data["UserData"][UserId]["SucceedCount"]++;
                data["UserData"][UserId]["Money"] += Number(ChargeMoney.replace("원", "").replace(",", ""));
                await writeData(data);
                await ReplyMessage.edit(new Discord.MessageEmbed()
                    .setTitle("✅ 충전 완료!")
                    .setColor(0x00FF00)
                    .addField("충전 금액", ChargeMoney)
                    .addField("걸린 시간", TimeDelayed + "ms")
                    .addField("성공 횟수", data["UserData"][UserId]["SucceedCount"] + "회")
                    .addField("실패 횟수", data["UserData"][UserId]["FailedCount"] + "회")
                    .addField("현재 돈", data["UserData"][UserId]["Money"] + "원"));
            }
            else {
                if (data["UserData"][UserId] === undefined) data["UserData"][UserId] = {SucceedCount: 0, FailedCount: 1, Money: 0, Warnings: "없음"};
                else data["UserData"][UserId]["FailedCount"]++;
                if (data["UserData"][UserId]["Warnings"] === "없음") data["UserData"][UserId]["Warnings"] = "";
                if (!ChargeState.contains("등록제한")) data["UserData"][UserId]["Warnings"] += data["UserData"][UserId]["Warnings"].split("\n").length + ". 충전 실패 (" + ChargeState + ") - 자판기 봇\n";
                await writeData(data);
                await ReplyMessage.edit(new Discord.MessageEmbed()
                    .setTitle("❌ " + ChargeState + "!")
                    .setColor(0xFF0000)
                    .addField("충전 금액", ChargeMoney)
                    .addField("걸린 시간", TimeDelayed + "ms")
                    .addField("성공 횟수", data["UserData"][UserId]["SucceedCount"] + "회")
                    .addField("실패 횟수", data["UserData"][UserId]["FailedCount"] + "회")
                    .addField("현재 돈", data["UserData"][UserId]["Money"] + "원"));
            }
            try
            {
                await message.delete();
            }
            catch {}
            currentlyUsing = false;
        }
        catch (error) {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ " + error)
                .setColor(0xFF0000));
            currentlyUsing = false;
            await CDriver.navigate().to("https://m.cultureland.co.kr/csh/cshGiftCard.do");
            return;
        }
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "forcecharge ")) {
        if (message.member.hasPermission("ADMINISTRATOR")) {
            if (message.mentions.users.first() === undefined) {
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ 돈을 추가할 유저를 @멘션 해주세요!")
                    .setColor(0xFF0000));
            }
            else {
                const ChargeMoney = message.content.replace(/  /g, " ").split(" ")[2];
                if (isNaN(ChargeMoney)) await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ 추가할 돈을 입력해주세요!")
                    .setColor(0xFF0000));
                else {
                    var data = await readData();
                    var UserId = message.mentions.users.first().id;
                    if (data["UserData"][UserId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("❌ 가입되어 있지 않습니다!")
                        .setColor(0xFF0000));
                    else {
                        data["UserData"][UserId]["Money"] += Number(ChargeMoney);
                        await writeData(data);
                        await message.channel.send(new Discord.MessageEmbed()
                            .setTitle("✅ 돈을 추가하였습니다!")
                            .setColor(0x00FF00)
                            .addField("현재 돈", data["UserData"][UserId]["Money"] + "원"));
                    }
                }
            }
        }
        else {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 권한이 없습니다!")
                .setColor(0xFF0000));
        }
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "buy ") || message.content.toLowerCase().startsWith(Prefix + "purchase ")) {
        var data = await readData();
        const splitMessage = message.content.split(" ");
        if (isNaN(splitMessage[2])) await message.channel.send(new Discord.MessageEmbed()
            .setTitle("❌ 구매할 상품의 개수를 입력해주세요!")
            .setColor(0xFF0000));
        else {
            const ProductId = Number(splitMessage[1]) - 1;
            const ProductQuantity = Math.floor(Number(splitMessage[2]));
            const UserId = message.author.id;
            if (data["UserData"][UserId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 가입되어 있지 않습니다!")
                .setColor(0xFF0000));
            else if (data["Products"][ProductId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 상품이 존재하지 않습니다!")
                .setColor(0xFF0000));
            else if (ProductQuantity < 1) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 구매할 상품의 개수를 입력해주세요! (1~)")
                .setColor(0xFF0000));
            else {
                const ProductData = data["Products"][ProductId];
                var productData = fs.readFileSync("./Products/" + ProductData["name"] + ".txt").toString().split("\n");
                if (ProductData["price"] > data["UserData"][UserId]["Money"]) await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ 돈이 부족합니다!")
                    .setColor(0xFF0000));
                else if (productData.length < ProductQuantity + 1) await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ 재고가 부족합니다!")
                    .setColor(0xFF0000));
                else {
                    try {
                        await message.author.send(new Discord.MessageEmbed()
                            .setTitle("❗ 테스트 DM입니다!")
                            .setColor(0x00FFFF));
                    }
                    catch (err) {
                        await message.channel.send(new Discord.MessageEmbed()
                            .setTitle("❌ DM 전송에 실패하였습니다! (" + err + ")")
                            .setColor(0xFF0000)
                            .setDescription("봇에게 DM을 한 번 보내주세요!"));
                        throw err;
                    }
                    data["UserData"][UserId]["Money"] -= ProductData["price"] * ProductQuantity;
                    var PurchasedItems = [];
                    var LeftOverItems = [];
                    productData.forEach(function(ItemData, ItemIndex) {
                        if (ItemIndex < ProductQuantity) PurchasedItems.push(ItemData);
                        else LeftOverItems.push(ItemData);
                    });
                    await fs.writeFile("./PurchasedItems.txt", PurchasedItems.join("\n"), async function(err) {
                        if (err) {
                            await message.channel.send(new Discord.MessageEmbed()
                                .setTitle("❌ " + err.message.toString())
                                .setColor(0xFF0000));
                            throw err;
                        }
                        await fs.writeFile("./Products/" + ProductData["name"] + ".txt", LeftOverItems.join("\n"), async function(err) {
                            if (err) {
                                await message.channel.send(new Discord.MessageEmbed()
                                    .setTitle("❌ " + err.message.toString())
                                    .setColor(0xFF0000));
                                throw err;
                            }
                        });
                        await message.author.send(new Discord.MessageEmbed()
                            .setTitle("✅ 구매해주셔서 감사합니다!")
                            .setColor(0x00FF00)
                            .addField("상품 이름", ProductData["name"])
                            .addField("상품 가격", ProductData["price"])
                            .addField("상품 설명", ProductData["details"])
                            .addField("상품 개수", ProductQuantity + "개")
                            .attachFiles(["./PurchasedItems.txt"]));
                        await writeData(data);
                        await fs.unlinkSync("./PurchasedItems.txt");
                        await message.channel.send(new Discord.MessageEmbed()
                            .setTitle("✅ 구매가 완료되었습니다!")
                            .setColor(0x00FF00)
                            .setDescription("DM을 확인해주세요!")
                            .addField("현재 돈", data["UserData"][UserId]["Money"] + "원"));
                    });
                }
            }
        }
    }
    else if (message.content.toLowerCase() === Prefix + "products") {
        const data = await readData();
        var ProductsArray = [];
        await data["Products"].forEach(async function(ProductData, ProductIndex) {
            ProductsArray.push({ name: (ProductIndex + 1) + ". " + ProductData["name"] + " - " + ProductData["price"] + "원 - "  + (fs.readFileSync("./Products/" + ProductData["name"] + ".txt").toString().split("\n").length - 1) + "개", value: ProductData["details"] });
        });
        await message.channel.send(new Discord.MessageEmbed()
            .setTitle("✅ 상품 목록")
            .setColor(0x00FF00)
            .addFields(ProductsArray));
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "createproduct ")) {
        if (message.member.hasPermission("ADMINISTRATOR")) {
            var ProductName = message.content.split(" ");
            ProductName.splice(0, 1);
            ProductName = ProductName.join(" ");
            if (await fs.existsSync("./Products/" + ProductName + ".txt")) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 상품이 이미 존재합니다!")
                .setColor(0xFF0000));
            else {
                await fs.writeFile("./Products/" + ProductName + ".txt", "", async function(err) {
                    if (err) {
                        await message.channel.send(new Discord.MessageEmbed()
                            .setTitle("❌ " + err.message.toString())
                            .setColor(0xFF0000));
                        throw err;
                    }
                    var ProductPrice;
                    var ProductDetails;
                    await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("❗ 상품의 가격을 입력해주세요!")
                        .setColor(0x00FFFF));
                    await message.channel.awaitMessages(m => !isNaN(m.content) && m.author.id === message.author.id, { max: 1, time: 60000, errors: ["time"] })
                        .then(function(m) {
                            ProductPrice = Number(m.first().content);
                        });
                    await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("❗ 상품의 설명을 입력해주세요!")
                        .setColor(0x00FFFF));
                    await message.channel.awaitMessages(m => m.author.id === message.author.id, { max: 1, time: 60000, errors: ["time"] })
                        .then(function(m) {
                            ProductDetails = m.first().content;
                        });
                    var data = await readData();
                    data["Products"].push({name: ProductName, price: ProductPrice, details: ProductDetails});
                    await writeData(data);
                    await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("✅ 상품이 추가되었습니다!")
                        .setColor(0x00FF00));
                });
            }
        }
        else {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 권한이 없습니다!")
                .setColor(0xFF0000));
        }
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "editproduct ")) {
        if (message.member.hasPermission("ADMINISTRATOR")) {
            var ProductName = message.content.split(" ");
            const ProductId = Number(ProductName[1]) - 1;
            ProductName.splice(0, 2);
            ProductName = ProductName.join(" ");
            var data = await readData();
            if (data["Products"][ProductId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 상품이 존재하지 않습니다!")
                .setColor(0xFF0000));
            else {
                var data = await readData();
                await fs.renameSync("./Products/" + data["Products"][ProductId]["name"] + ".txt", "./Products/" + ProductName + ".txt");
                data["Products"][ProductId]["name"] = ProductName;
                var ProductPrice;
                var ProductDetails;
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❗ 상품의 새로운 가격을 입력해주세요!")
                    .setColor(0x00FFFF));
                await message.channel.awaitMessages(m => !isNaN(m.content) && m.author.id === message.author.id, { max: 1, time: 60000, errors: ["time"] })
                    .then(function(m) {
                        ProductPrice = m.first().content;
                    });
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❗ 상품의 새로운 설명을 입력해주세요!")
                    .setColor(0x00FFFF));
                await message.channel.awaitMessages(m => m.author.id === message.author.id, { max: 1, time: 60000, errors: ["time"] })
                    .then(function(m) {
                        ProductDetails = m.first().content;
                    });
                data["Products"][ProductId]["price"] = Number(ProductPrice);
                data["Products"][ProductId]["details"] = ProductDetails;
                await writeData(data);
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("✅ 상품이 수정되었습니다!")
                    .setColor(0x00FF00));
            }
        }
        else {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 권한이 없습니다!")
                .setColor(0xFF0000));
        }
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "removeproduct ")) {
        if (message.member.hasPermission("ADMINISTRATOR")) {
            const ProductId = Number(message.content.split(" ")[1]) - 1;
            var ProductDetails;
            var data = await readData();
            if (data["Products"][ProductId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 상품이 존재하지 않습니다!")
                .setColor(0xFF0000));
            else {
                var AskAgain;
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❓ 상품을 정말로 삭제하시겠습니까?")
                    .setColor(0x00FFFF)
                    .setDescription("상품의 이름, 가격, 설명, 재고들이 모두 사라집니다!")
                    .setFooter("정말로 삭제하시려면 " + Prefix + "removeproduct 를 입력해주세요!"));
                await message.channel.awaitMessages(m => m.author.id === message.author.id, { max: 1, time: 60000, errors: ["time"] })
                    .then(function(m) {
                        AskAgain = m.first().content.toLowerCase() === Prefix + "removeproduct";
                    });
                if (AskAgain) {
                    var data = await readData();
                    await fs.unlinkSync("./Products/" + data["Products"][ProductId]["name"] + ".txt");
                    await data["Products"].splice(ProductId, 1);
                    await writeData(data);
                    await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("✅ 상품이 삭제되었습니다!")
                        .setColor(0x00FF00));
                }
                else await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("✅ 상품 삭제를 취소하셨습니다!")
                    .setColor(0x00FF00));
            }
        }
        else {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 권한이 없습니다!")
                .setColor(0xFF0000));
        }
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "additems")) {
        if (message.member.hasPermission("ADMINISTRATOR")) {
            const ProductId = Number(message.content.split(" ")[1]) - 1;
            const data = await readData();
            if (data["Products"][ProductId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 상품이 존재하지 않습니다!")
                .setColor(0xFF0000));
            else {
                await fs.readFile("./Products/" + data["Products"][ProductId]["name"] + ".txt", async function(err, productData) {
                    if (err) {
                        await message.channel.send(new Discord.MessageEmbed()
                            .setTitle("❌ " + err.message.toString())
                            .setColor(0xFF0000));
                        throw err;
                    }
                    request(message.attachments.first().url, async function(err, res, body) {
                        if (err) {
                            await message.channel.send(new Discord.MessageEmbed()
                                .setTitle("❌ " + err.message.toString())
                                .setColor(0xFF0000));
                            throw err;
                        }
                        body.split("\n").forEach(function(ProductItem) {
                            if (ProductItem !== "") productData = productData.toString() + ProductItem + "\n";
                        });
                        await fs.writeFile("./Products/" + data["Products"][ProductId]["name"] + ".txt", productData, async function(err) {
                            if (err) {
                                await message.channel.send(new Discord.MessageEmbed()
                                    .setTitle("❌ " + err.message.toString())
                                    .setColor(0xFF0000));
                                throw err;
                            }
                            await message.channel.send(new Discord.MessageEmbed()
                                .setTitle("✅ 재고가 추가되었습니다!")
                                .setColor(0x00FF00));
                        });
                    });
                });
            }
        }
        else {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 권한이 없습니다!")
                .setColor(0xFF0000));
        }
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "info")) {
        const data = await readData();
        var UserId;
        if (message.mentions.users.first() === undefined) {
            UserId = message.author.id;
            if (data["UserData"][UserId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 가입되어 있지 않습니다!")
                .setColor(0xFF0000));
            else await message.channel.send(new Discord.MessageEmbed()
                .setTitle("✅ 유저 정보")
                .setColor(0x00FF00)
                .addField("성공 횟수", data["UserData"][UserId]["SucceedCount"] + "회")
                .addField("실패 횟수", data["UserData"][UserId]["FailedCount"] + "회")
                .addField("현재 돈", data["UserData"][UserId]["Money"] + "원")
                .addField("경고 (" + (data["UserData"][UserId]["Warnings"].split("\n").length - 1) + "회)", data["UserData"][UserId]["Warnings"]));
        }
        else {
            UserId = message.mentions.users.first().id;
            if (data["UserData"][UserId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 가입되어 있지 않습니다!")
                .setColor(0xFF0000));
            else await message.channel.send(new Discord.MessageEmbed()
                .setTitle("✅ 유저 정보")
                .setColor(0x00FF00)
                .addField("성공 횟수", data["UserData"][UserId]["SucceedCount"] + "회")
                .addField("실패 횟수", data["UserData"][UserId]["FailedCount"] + "회")
                .addField("현재 돈", data["UserData"][UserId]["Money"] + "원")
                .addField("경고 (" + (data["UserData"][UserId]["Warnings"].split("\n").length - 1) + "회)", data["UserData"][UserId]["Warnings"]));
        }
    }
    else if (message.content.toLowerCase() === Prefix + "register") {
        var data = await readData();
        if (data["UserData"][message.author.id] === undefined) {
            data["UserData"][message.author.id] = {SucceedCount: 0, FailedCount: 0, Money: 0, Warnings: "없음"};
            await writeData(data);
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("✅ 가입을 완료하였습니다!")
                .setColor(0x00FF00));
        }
        else await message.channel.send(new Discord.MessageEmbed()
            .setTitle("❌ 이미 가입되어 있습니다!")
            .setColor(0xFF0000));
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "warn ")) {
        if (message.member.hasPermission("ADMINISTRATOR")) {
            if (message.mentions.users.first() === undefined) {
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ 경고할 유저를 @멘션 해주세요!")
                    .setColor(0xFF0000));
            }
            else {
                var data = await readData();
                var UserId = message.mentions.users.first().id;
                if (data["UserData"][UserId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ 가입되어 있지 않습니다!")
                    .setColor(0xFF0000));
                else {
                    var WarningMessage = message.content.split(" ");
                    WarningMessage.splice(0, 2);
                    if (data["UserData"][UserId]["Warnings"] === "없음") data["UserData"][UserId]["Warnings"] = "";
                    data["UserData"][UserId]["Warnings"] += data["UserData"][UserId]["Warnings"].split("\n").length + ". " + WarningMessage.join(" ").trim() + " - " + message.author.tag + " [" + message.author.id + "]" + "\n";
                    await writeData(data);
                    await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("✅ 경고를 추가하였습니다!")
                        .setColor(0x00FF00)
                        .addField("경고 (" + (data["UserData"][UserId]["Warnings"].split("\n").length - 1) + "회)", data["UserData"][UserId]["Warnings"]));
                }
            }
        }
        else {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 권한이 없습니다!")
                .setColor(0xFF0000));
        }
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "clearwarns ")) {
        if (message.member.hasPermission("ADMINISTRATOR")) {
            if (message.mentions.users.first() === undefined) {
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ 경고를 초기화할 유저를 @멘션 해주세요!")
                    .setColor(0xFF0000));
            }
            else {
                var data = await readData();
                var UserId = message.mentions.users.first().id;
                if (data["UserData"][UserId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ 가입되어 있지 않습니다!")
                    .setColor(0xFF0000));
                else {
                    if (data["UserData"][UserId]["Warnings"] !== "없음") {
                        data["UserData"][UserId]["Warnings"] = "없음";
                        await writeData(data);
                    }
                    await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("✅ 경고를 초기화하였습니다!")
                        .setColor(0x00FF00)
                        .addField("경고 (0회)", "없음"));
                }
            }
        }
        else {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 권한이 없습니다!")
                .setColor(0xFF0000));
        }
    }
    else if (message.content.toLowerCase().startsWith(Prefix + "removewarn ")) {
        if (message.member.hasPermission("ADMINISTRATOR")) {
            const WarningIndex = message.content.split(" ")[2];
            if (isNaN(WarningIndex) || Number(WarningIndex) < 1) await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 삭제할 경고의 번호를 입력해주세요! (1~)")
                .setColor(0xFF0000));
            else {
                if (message.mentions.users.first() === undefined) {
                    await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("❌ 경고를 삭제할 유저를 @멘션 해주세요!")
                        .setColor(0xFF0000));
                }
                else {
                    var data = await readData();
                    var UserId = message.mentions.users.first().id;
                    if (data["UserData"][UserId] === undefined) await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("❌ 가입되어 있지 않습니다!")
                        .setColor(0xFF0000));
                    else if (Math.floor(Number(WarningIndex)) !== Number(WarningIndex)) await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("❌ 자연수인 번호를 입력해주세요!")
                        .setColor(0xFF0000));
                    else if ((data["UserData"][UserId]["Warnings"].split("\n").length - 1) < WarningIndex) await message.channel.send(new Discord.MessageEmbed()
                        .setTitle("❌ " + WarningIndex + "번째 경고가 없습니다!")
                        .setColor(0xFF0000));
                    else {
                        if (data["UserData"][UserId]["Warnings"] === "없음") await message.channel.send(new Discord.MessageEmbed()
                            .setTitle("❌ 경고가 없습니다!")
                            .setColor(0xFF0000));
                        else {
                            var splitWarnings = data["UserData"][UserId]["Warnings"].split("\n");
                            splitWarnings.splice(WarningIndex - 1, 1);
                            splitWarnings.forEach(function(Message, Index) {
                                if (Index > WarningIndex - 2) splitWarnings[Index] = splitWarnings[Index].replace((Index + 2) + ".", (Index + 1) + ".");
                            });
                            data["UserData"][UserId]["Warnings"] = splitWarnings.join("\n");
                            await writeData(data);
                            await message.channel.send(new Discord.MessageEmbed()
                                .setTitle("✅ " + WarningIndex + "번째 경고를 삭제하였습니다!")
                                .setColor(0x00FF00)
                                .addField("경고 (" + (data["UserData"][UserId]["Warnings"].split("\n").length - 1) + "회)", data["UserData"][UserId]["Warnings"]));
                        }
                    }
                }
            }
        }
        else {
            await message.channel.send(new Discord.MessageEmbed()
                .setTitle("❌ 권한이 없습니다!")
                .setColor(0xFF0000));
        }
    }
});

function readData() {
    return new Promise(async function(resolve, reject) {
        await fs.readFile("./data.json", async function(err, data) {
            if (err) {
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ " + err.message.toString())
                    .setColor(0xFF0000));
                throw err;
            }
            resolve(JSON.parse(data));
        });
    });
}

function writeData(data) {
    return new Promise(async function(resolve, reject) {
        await fs.writeFile("./data.json", JSON.stringify(data), async function(err) {
            if (err) {
                await message.channel.send(new Discord.MessageEmbed()
                    .setTitle("❌ " + err.message.toString())
                    .setColor(0xFF0000));
                throw err;
            }
            resolve(true);
        });
    });
}

function sleep(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

readData()
    .then(async function(data) {
        await Client.login(data["BotToken"])
    });