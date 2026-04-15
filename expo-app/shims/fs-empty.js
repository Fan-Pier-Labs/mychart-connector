const noop = () => { throw new Error("fs is not available in React Native"); };
module.exports = new Proxy({}, { get: () => noop });
