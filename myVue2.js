class Vue {
  constructor(options) {
    this.$data = options.data;
    Observer(this.$data);
    Compile(options.el, this);
  }
}

// 数据劫持
function Observer(data) {
  const dependency = new Dependency();
  if (!data || typeof data !== "object") return;
  Object.keys(data).forEach((item) => {
    let value = data[item];
    Observer(value);
    Object.defineProperty(data, item, {
      enumerable: true,
      configurable: true,
      get() {
        console.log(`${item}被获取了，值为${value}`);
        Dependency.temp && dependency.addSub(Dependency.temp);
        return value;
      },
      set(newValue) {
        console.log(`${item}被赋值${newValue}`);
        value = newValue;
        Observer(value);
        dependency.notify();
      },
    });
  });
}

// 模板解析
function Compile(element, vm) {
  vm.$el = document.querySelector(element);
  const fragment = document.createDocumentFragment();
  let child;
  while ((child = vm.$el.firstChild)) {
    // 将el的所有子节点append进入fragment，这个过程el会一个一个节点减少
    fragment.append(child);
  }
  compile_fragment(fragment);
  function compile_fragment(node) {
    const pattern = /\{\{\s*(\S+)\s*\}\}/;
    // 渲染模板语法文本
    if (node.nodeType === 3) {
      const result = pattern.exec(node.nodeValue);
      const init_nodeValue = node.nodeValue;
      //   console.log(result);
      if (result) {
        const value = result[1]
          .split(".")
          .reduce((total, current) => total[current], vm.$data);
        node.nodeValue = node.nodeValue.replace(pattern, value);
        new Watcher(vm, result[1], (newValue) => {
          node.nodeValue = init_nodeValue.replace(pattern, newValue);
        });
      }
    }
    // 渲染元素节点-input
    if (node.nodeType === 1 && node.nodeName === "INPUT") {
      //   console.log(node.attributes);
      const attr = Array.from(node.attributes);
      attr.forEach((i) => {
        if (i.nodeName === "v-model") {
          // 绑定input.value与v-model的值
          const value = i.nodeValue
            .split(".")
            .reduce((total, current) => total[current], vm.$data);
          node.value = value;
          new Watcher(vm, i.nodeValue, (newValue) => {
            node.value = newValue;
          });
          // 为input添加输入事件
          node.addEventListener("input", (e) => {
            const arr = i.nodeValue.split(".");
            const arr2 = arr.slice(0, arr.length - 1);
            const final = arr2.reduce(
              (total, current) => total[current],
              vm.$data
            );
            final[arr[arr.length - 1]] = e.target.value;
          });
        }
      });
    }
    node.childNodes.forEach((n) => compile_fragment(n));
  }

  vm.$el.append(fragment);
}

// 发布订阅者模式
class Dependency {
  constructor() {
    this.subscribers = [];
  }
  addSub(sub) {
    this.subscribers.push(sub);
  }
  notify() {
    this.subscribers.forEach((sub) => sub.update());
  }
}

class Watcher {
  constructor(vm, key, callback) {
    this.vm = vm;
    this.key = key;
    this.callback = callback;
    Dependency.temp = this;
    key.split(".").reduce((total, current) => total[current], vm.$data);
    Dependency.temp = null;
  }
  update() {
    const value = this.key
      .split(".")
      .reduce((total, current) => total[current], this.vm.$data);
    this.callback(value);
  }
}
