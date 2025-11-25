// prepare_weekly_input.js (FINAL VERSION - PRECISELY MIRRORING CIRCOM)
const fs = require('fs');
const circomlibjs = require('circomlibjs'); 

// 定义默克尔树的参数
const TREE_LEVELS = 7;
const TREE_LEAVES_COUNT = 1 << TREE_LEVELS; // 32

// 主函数
async function prepareWeeklyInput(inputFile) {
    console.log(`--- 开始从文件 "${inputFile}" 准备周度汇总输入 ---`);

    // 1. 读取、排序、填充 (保持不变)
    if (!fs.existsSync(inputFile)) {
        console.error(`错误: 输入文件 "${inputFile}" 不存在!`);
        process.exit(1);
    }
    const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    const checkinCommitments = rawData.checkinCommitments;
    if (!Array.isArray(checkinCommitments)) {
        console.error(`错误: 文件 "${inputFile}" 中未找到 "checkinCommitments" 数组。`);
        process.exit(1);
    }
    console.log(`成功提取 ${checkinCommitments.length} 个 checkinCommitment。`);
    const sortedCommitments = checkinCommitments.sort((a, b) => a.localeCompare(b));
    console.log("已对 Commitment 进行排序。");
    const leaves = [...sortedCommitments];
    while (leaves.length < TREE_LEAVES_COUNT) {
        leaves.push("0");
    }
    console.log(`已将叶子节点填充至 ${TREE_LEAVES_COUNT} 个。`);

    // 4. 计算默克尔根 (精确镜像Circom的计算逻辑)
    console.log("正在精确镜像计算默克尔根 (带 levelOffset)...");
    
    const poseidon = await circomlibjs.buildPoseidon();
    
    // 将叶子转换为 BigInt
    const leavesBI = leaves.map(v => BigInt(v));

    // 创建一个与电路中 intermediateHashes 角色相同的数组
    const intermediateHashes = [];

    // --- JS逻辑开始精确翻译Circom ---

    // 对应Circom的第一步: 计算第一层
    for (let i = 0; i < TREE_LEAVES_COUNT / 2; i++) {
        const hash = poseidon([leavesBI[2*i], leavesBI[2*i + 1]]);
        intermediateHashes.push(hash);
    }

    // 对应Circom的第二步: 计算后续所有层
    let levelOffset = 0;
    for (let d = 1; d < TREE_LEVELS; d++) {
        const nNodesInLevel = TREE_LEAVES_COUNT >> d;
        for (let i = 0; i < nNodesInLevel / 2; i++) {
            const left = intermediateHashes[levelOffset + 2*i];
            const right = intermediateHashes[levelOffset + 2*i + 1];
            const hash = poseidon([left, right]);
            intermediateHashes.push(hash);
        }
        levelOffset += nNodesInLevel / 2;
    }

    // --- 翻译结束 ---

    // 最后一个被推入数组的元素就是根
    const merkleRoot = poseidon.F.toString(intermediateHashes[intermediateHashes.length - 1]);
    console.log(` -> 默克尔根计算完成: ${merkleRoot}`);

    // 5. 组装并写入最终的输入文件
    const weeklyInput = {
        merkleRoot: merkleRoot,
        leaves: leaves 
    };

    const outputFile = 'input_weekly.json';
    fs.writeFileSync(outputFile, JSON.stringify(weeklyInput, null, 2));

    console.log("\n--- 成功! ---");
    console.log(`周度汇总的输入文件已生成: ${outputFile}`);
}

// --- 命令行接口 (保持不变) ---
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.log("用法: node prepare_weekly_input.js <输入JSON文件>");
    console.log("示例: node prepare_weekly_input.js input_weekly.json");
    process.exit(1);
}
const inputFilePath = args[0];
prepareWeeklyInput(inputFilePath).catch(err => {
    console.error("处理过程中发生错误:", err);
});