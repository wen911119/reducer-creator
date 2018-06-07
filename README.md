> ### 用途

```
改善和增强redux中reducer。
```

> ### 改善了什么

##### 使用reducer-creator之前，一个标准的reducer可能长这样

```javascript
const initState = {
  todos: [
    {
      name: '洗碗',
      deadline: '22:00'
    },
    {
      name: '洗澡',
      deadline: '23:00'
    },
    {
      name: '学英语',
      deadline: '24:00'
    }
  ],
  done: [
    {
      name: '跑步',
      deadline: '21:00'
    }
  ],
  num: 1
}
const Reducer = (state = initState, action = {}) => {
  const { type, payload } = action
  switch (type) {
    case 'ADD_TODO':
      let newState = Object.assign({}, state) // 为了改变引用
      newState.todos = Array.form(newState.todos) // 还是为了改引用
      newState.push(payload) // 假设这里payload = {name: '遛狗', deadline: '20:00'}
      return newState
    case 'UPDATE_TODO':
      let newState2 = Object.assign({}, state) // 为了改变引用
      newState2.todos = Array.form(newState.todos) // 还是为了改引用
      // 假设这里payload = 数组索引
      newState2.todos[payload] = Object.assign({}, newState.todos[payload], {
        deadline: '19:00'
      })
      return newState2
    case 'DELETE_TODO':
      // 假设cloneDeep = require('lodash.cloneDeep')
      let newState3 = cloneDeep(state) // 深拷贝，简单暴力，不用再考虑改变引用的问题
      // 假设payload = 要删除的数组索引
      const todoDeleted = newState3.todos.splice(payload, 1)
      newState3.done.push(todoDeleted[0])
      return newState3
    default:
      return state
  }
}
```
##### 上面的代码存在这样的一些问题：
###### 1.switch-case 的各个分支不存在局部作用域，所以不能有同名变量。所以只能写成newState，newState2，newState3...
###### 2.为了最小代价去更新组件树，要时刻考虑哪些要改变引用，哪些保留。这种命令式的代码写起来让人很累。如果用lodash的cloneDeep暴力解决，又必然带来严重的性能问题（不仅仅是cloneDeep的消耗，还有更多的re-render）。
###### 3.每次都要return一个新的state，这种机械重复的操作实在没有意义。

##### 使用reducer-creator之后，reducer变成了这样：
```javascript
const initState = {
    // 同前
}
const Reducer = ReducerCreator(initState)({
    ADD_TODO: ({ stateSetter, payload }) => {
        stateSetter.todos.push(payload) // 假设这里payload = {name: '遛狗', deadline: '20:00'}
    },
    UPDATE_TODO: ({ stateSetter, payload }) => {
      stateSetter.todos[payload].deadline = '19:00'
    },
    DELETE_TODO: ({stateSetter, payload}) => {
      const todoDeleted = stateSetter.todos.splice(payload, 1)
      stateSetter.done.push(todoDeleted[0])
    }
})
```
##### 对比之前的写法，是不是好了很多？
##### 你可能有一些担忧，上面的代码好像是在直接修改state，并且也没有把state返回。这些都是redux的大忌！
##### 事实当然不是这样。
##### { stateSetter } 只是state的影子，所有对影子做的操作都不会真的修改state。但是这些操作能很好的反应你的意图。
##### ReducerCreator 的主要工作，就是根据你的修改意图，在原来state的基础上,「突变」出一个新的state。并将新的state返回。
##### 所以一切都能正常工作，并且很好的工作。突变出的state内部大量没有被修改部分的引用都没有发生改变，所以能避免无谓的re-render。


> ### 增强了什么
##### 快照和时间旅行

```javascript
const initState = {
    // 同前
}
const Reducer = ReducerCreator(initState)({
    SOME_THING: ({ stateSetter, stateGetter, payload, snap, undo }) => {
      // 完整版共有 5 个参数, 你可以通过解构取所需
      // stateSetter 用来修改新的state
      // stateGetter 用来读取当前state
      // payload 就是payload
      // snap 是一个方法，用来创建一个快照。比如 const snapshotId = snap()
      // undo 是一个方法，用来回滚操作。比如 undo()返回上一个快照, undo(snapshotId),返回到某个快照。
    }
    // ...
    // ...
})
```
##### 用 const snapshotId = snap() 、 undo() 、undo(snapshotId),就可以轻松完成时间旅行。
##### snap() 快照的实现是基于结构共享，不会有太大内存开销。所以需要用时不必有顾虑:)


> ### 听起来和immutable.js很像？
##### 确实如此。
##### 结构共享和时间旅行immutable.js都能实现。那为什么还要用这个reducer-creator？
##### 因为简单、轻量、低侵入性

> ### 使用限制
##### 1.核心功能基于 ES6 Proxy 实现。不支持的环境需要一个1.5kb的[proxy-polyfill](https://github.com/GoogleChrome/proxy-polyfill)。
##### 2.stateSetter和stateGetter分别负责写和读。严格读写分离！比如下面的写法会报错：
```javascript
const initState = {
    // 同前
}
const Reducer = ReducerCreator(initState)({
    SOME_THING: ({ stateSetter, stateGetter, payload, snap, undo }) => {
      stateSetter.num += 3 // 会报错
      stateSetter.num ++ // 会报错
      // 因为++和+=都会在stateSetter上执行一次读操作
      // 需要改成这样
      stateSetter.num = stateGetter + 3
      stateSetter.num = stateGetter + 1
    // ...
    // ...
})
```
