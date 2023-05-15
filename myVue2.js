// myVue2.js
class Vue {
  constructor(obj_instance) {
    this.$data = obj_instance.data;
    Observer(this.$data);
    Compiler(obj_instance.el, this);
  }
}

// 数据劫持
const Observer = (data_instance) => {
  const publisher = new Publisher();
  // 递归结束条件结束
  if (!data_instance || typeof data_instance !== "object") return;
  Object.keys(data_instance).forEach((item) => {
    let value = data_instance[item];
    Observer(value);
    Object.defineProperty(data_instance, item, {
      enumerable: true,
      configurable: true,
      get() {
        Publisher.temp && publisher.addSub(Publisher.temp);
        return value;
      },
      set(newValue) {
        value = newValue;
        Observer(value);
        publisher.notify();
      },
    });
  });
};

// 页面渲染
const Compiler = (element, vm) => {
  // 绑定DOM节点 - 即div#app
  vm.$el = document.querySelector(element);
  const fragment = new DocumentFragment();
  // 获取$el的所有子节点
  let childNode;
  while ((childNode = vm.$el.firstChild)) {
    fragment.append(childNode);
  }
  compileFragment(fragment);
  function compileFragment(node) {
    const pattern = /\{\{\s*(\S+)\s*\}\}/;
    if (node.nodeType === 3) {
      const result = pattern.exec(node.nodeValue);
      const initNodeValue = node.nodeValue;
      if (result) {
        // console.log(result[1]);
        const value = result[1]
          .split(".")
          .reduce((total, current) => total[current], vm.$data);
        node.nodeValue = node.nodeValue.replace(pattern, value);
        new Watcher(vm, result[1], (newValue) => {
          node.nodeValue = initNodeValue.replace(pattern, newValue);
        });
      }
    }
    // data -> input.value 单向绑定
    if (node.nodeType === 1 && node.nodeName === "INPUT") {
      const attributes = Array.from(node.attributes);
      attributes.forEach((attr) => {
        if (attr.nodeName === "v-model") {
          const value = attr.nodeValue
            .split(".")
            .reduce((total, current) => total[current], vm.$data);
          node.value = value;
          new Watcher(vm, attr.nodeValue, (newValue) => {
            node.value = newValue;
          });
          // input.value -> data 单向绑定
          node.addEventListener("input", (e) => {
            const arr = attr.nodeValue.split("."); // 获取所有层的key
            const arr2 = arr.slice(0, arr.length - 1); // 排去最后一层的key
            const final = arr2.reduce(
              (total, current) => total[current],
              vm.$data
            ); // 一直递归到倒数第二层
            final[arr[arr.length - 1]] = e.target.value; // 倒数第二层[最后一个key] = 最底下的值
          });
        }
      });
    }
    node.childNodes.forEach((child) => {
      compileFragment(child);
    });
  }
  vm.$el.append(fragment);
};

// 发布订阅模式
class Publisher {
  constructor() {
    this.subscribers = [];
  }
  addSub(subscriber) {
    this.subscribers.push(subscriber);
  }
  notify() {
    this.subscribers.forEach((subscriber) => subscriber.update());
  }
}

class Watcher {
  constructor(vm, key, callback) {
    this.vm = vm;
    this.key = key;
    this.callback = callback;
    Publisher.temp = this;
    // console.log(JSON.stringify(vm.$data));
    // key.split(".").reduce((total, current) => total[current], vm.$data);
    // console.log(JSON.stringify(vm.$data));
    Publisher.temp = null;
  }
  update() {
    const value = this.key
      .split(".")
      .reduce((total, current) => total[current], this.vm.$data);
    this.callback(value);
  }
}
