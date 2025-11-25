// src/mq/consumers/user.consumer.js

/**
 * 处理 "user.created" 事件的逻辑
 * @param {object} user - 从消息中解析出的用户对象
 */
function handleUserCreated(user) {
  console.log(`[MQ Consumer] Received user.created event for user ID: ${user.id}`);
  
  // 在这里执行异步任务，例如：
  // 1. 发送欢迎邮件
  console.log(`   -> SIMULATING: Sending welcome email to ${user.email}...`);
  // 2. 初始化用户积分账户
  console.log(`   -> SIMULATING: Initializing points account for ${user.username}...`);
  // 3. 将用户信息同步到其他系统
  console.log(`   -> SIMULATING: Syncing user data to CRM system...`);
  
  // 模拟一个耗时任务
  setTimeout(() => {
    console.log(`[MQ Consumer] Finished processing tasks for user ID: ${user.id}`);
  }, 2000);
}

module.exports = {
  handleUserCreated,
};