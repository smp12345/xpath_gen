(function(global) {

// if the panel has already been inserted, just stop execution
if (global.xpathPanelInserted) {
  console.debug('xpath panel has been injected, toggling it')
  global.togglePanel('xpal-panel');
  return;
} else {
  console.debug('xpath panel not injected, continuing the execution')
  global.xpathPanelInserted = true;
}

/**
 * toggles the panel
 */
function togglePanel(id) {
    let panel = document.getElementById(id);
    if (panel.style.display == 'none') {
        console.debug('showing panel')
        panel.style.display = 'block';
    } else {
        console.debug('hidding panel')
        panel.style.display = 'none';
    }
}

global.togglePanel = togglePanel


// the panel html template.
//
// It's not that I like to write divs, I just don't want to mess up with the
// page's original styles.
let panelTemplate = `
<div class="xpal-panel" id="xpal-panel">
    <div id="xpal-title-bar">
        <div id="xpal-title">XPath Generator - part of Project Baelish</div>
        <div>按 Shift+↑ 扩大选取，Shift+↓缩小，Shift+←上一个元素，Shift+→下一个元素</div>
        <div id="xpal-title-control">
          <a id="xpal-minimize-button" title="minimize" class="xpal-title-bar-button" @click="minimizeXpathPanel">_</a>
          <a id="xpal-close-button" title="close" class="xpal-title-bar-button" @click="closeXpathPanel">x</a>
        </div>
    </div>
    <div id="xpal-main">
      <div>
          <a class="xpath-button" id="inspect-button" @click="toggleInspect">{{ inspectButton }}</a>
          <a :class="['xpath-button', {
                'xpath-button--disable': !selectedDom.length
            }]"
            id="relatively-inspect-button"
            @click="toggleRelativelyInspect">{{ relativelyInspectButton }}</a>
          <a class="xpath-button" id="clear-style-button" @click="clearAll">Clear Style</a>
          <a class="xpath-button" id="delete-all-button" @click="clearXpaths">Delete All</a>
      </div>
      <div id="table-panel">
          <table id="xpath-table">
              <tr>
                  <th>XPath</th>
                  <th v-if="isRelative">Relatively XPath</th>
                  <th>Matches</th>
                  <th>Test</th>
                  <th>Verify</th>
                  <th>Delete</th>
              </tr>
              <tr v-for="(result, index) in xpaths">
                  <td class="xpath-expression" contenteditable="true">
                    {{result.elementXpath}}
                  </td>
                  <td class="xpath-expression" v-if="isRelative">
                    {{result.elementRelativelyXpath}}
                  </td>
                  <td class="xpath-match-count">
                    {{result.matchCount}}
                  </td>
                  <td>
                    <a class="xpath-button" @click="setTestXpath(result.elementXpath)">Test</a>
                  </td>
                  <td>
                    <a class="xpath-button" @click="verifyXpath(result.elementXpath)">Verify</a>
                  </td>
                  <td><a class="xpath-button" href="#" @click="deleteXpath(index)">delete</a></td>
              </tr>
          </table>
      </div>
      <div id="xpath-tester">
          <div>XPath Test</div>
          <textarea placeholder="input your xpath here to test" v-model="xpathTesting"></textarea>
          <div>
            <a class="xpath-button" @click="addBack(xpathTesting)">Add To Table</a>
          </div>
          <div id="xpal-value">The result({{xpathValue.length}}):
            <ol contenteditable="true">
            <li v-for="val in xpathValue">
              {{ val }}
            </li>
            </ol>
          </div>
      </div>
    </div>
</div>
`

document.body.insertAdjacentHTML('beforeend', panelTemplate)

let inspecting = false;
let relativelyInspecting = false;

let vm = new Vue({
    el: '.xpal-panel',
    data: {
        isRelative: false,
        inspectButton: "Start Inspect",
        xpaths: [],
        xpathTesting: '',
        relativelyInspectButton: "Start relatively Inspect",
        verifyXpathVal: '',
        selectedDom: [],
        xpathValue: [],
    },
    methods: {
        getXpathValue: function () {
            try {
                const xpathTesting = this.xpathTesting;
                let value = X.stringify(xpathTesting)
                this.verifyXpath(xpathTesting)
                this.xpathValue = value;
            } catch (e) {
                this.xpathValue = ['not valid expression'];
            }
        },
        addBack: function(xpath) {
          let matchCount = X.selectElements(xpath).length;
          this.xpaths.unshift({elementXpath: xpath, matchCount});
        },
        toggleInspect: function() {
            this.isRelative = false;
            if (inspecting) {
                this.inspectButton = "Start Inspect";
                stopInspect();
                inspecting = false;
            } else {
                this.inspectButton = "Stop Inspect";
                startInspect();
                inspecting = true;
            }
        },
        toggleRelativelyInspect: function() {
            if (!this.isRelative) {
                this.clearXpaths();
            }
            this.isRelative = true;
            if (!this.selectedDom.length) {
                return;
            }
            if (relativelyInspecting) {
                this.relativelyInspectButton = "Start relatively Inspect";
                stopRelativelyInspect();
                relativelyInspecting = false;
            } else {
                this.relativelyInspectButton = "Stop relatively Inspect";
                startRelativelyInspect();
                relativelyInspecting = true;
            }
        },
        clearXpaths: function() {
            this.xpaths = [];
        },
        clearSelectedDom: function() {
            this.selectedDom = [];
        },
        pushSelectedDom(el) {
            this.selectedDom.push(el);
        },
        verifyXpath: function(xpath) {
            if (!this.isRelative) {
                this.verifyXpathVal = xpath;
                this.clearAll();
            } else {
                this.clearRelativelyAll();
            }
            let flag = true;
            xpath = X.removePostfix(xpath)
            for (let el of X.selectElements(xpath)) {
              if (flag) {
                el.scrollIntoView()
                flag = false;
              }
              if (!this.isRelative) {
                el.setAttribute("data-xpal", "xpath-verify-selected");
                this.pushSelectedDom(el);
              } else {
                el.setAttribute("data-xpal", "xpath-relative-verify-selected");
              }
            }
        },
        deleteXpath: function(index) {
          this.xpaths.splice(index, 1);
        },
        clearAll: function() {
            for (let el of document.getElementsByTagName('*')) {
                el.removeAttribute("data-xpal");
            }
            this.clearSelectedDom();
        },
        clearRelativelyAll() {
            for (let el of document.querySelectorAll('[data-xpal^=xpath-relative]')) {
                el.removeAttribute('data-xpal');
            }
        },
        closeXpathPanel: function() {
          togglePanel('xpal-panel')
        },
        minimizeXpathPanel: function() {
          togglePanel('xpal-main')
        },
        setTestXpath: function(xpath) {
          this.xpathTesting = xpath;
        }
    },
    watch: {
        xpathTesting() {
            this.getXpathValue();
        }
    }
});


/**
 * add a listener that will only be called once
 * @param  {HTMLElement}  node       node to listen event on
 * @param  {string}       type       event type e.g. click
 * @param  {Function}     listener   listener callback
 * @param  {Boolean}      useCapture whether to use capture
 * @return {Function}                the wrapped function, which can be used to cancel the listener
 */
function listenOnce(node, type, listener, useCapture=false) {
    let wrapper = (event) => {
        node.removeEventListener(type, wrapper, useCapture);
        return listener(event);
    };

    node.addEventListener(type, wrapper, useCapture);
    return wrapper;
};
/**
 * update xpath result
 */

let prev = null;
let prevListener = null;

function inspectHandler(event) {
    if (prev) {
        //prev.classList.remove('xpath-inspecting');
        prev.removeAttribute('data-xpal');
        prev.removeEventListener('click', prevListener);
        prev = null;
    }
    if (event.currentTarget) {
        prev = event.currentTarget;
        prevListener = listenOnce(event.currentTarget, 'click', clickHandler);
        //prev.classList.add('xpath-inspecting');
        prev.setAttribute('data-xpal', 'xpath-inspecting');
    }
    event.stopPropagation();
};

function selectDom(dom) {
    dom.removeAttribute('data-xpal');
    for (let elementXpath of X.findPossibleXpaths(dom)) {
        try {
          let matchCount = X.selectElements(elementXpath).length;
          vm.xpaths.unshift({elementXpath, matchCount});
        } catch (e) {
          console.warn(`${elementXpath} is not valid`);
        }
    }
    dom.setAttribute('data-xpal', 'xpath-selected');
}

function clickHandler(event) {
    selectDom(event.currentTarget);
    stopInspect();
    inspecting = false;
    vm.inspectButton = "Start Inspect";
    event.stopImmediatePropagation();
    event.preventDefault();
}

function startInspect() {
    for (let el of document.getElementsByTagName('*')) {
        el.removeAttribute('data-xpal');
    }
    for (let el of document.getElementsByTagName('*')) {
        el.addEventListener('mouseover', inspectHandler);
    }
    let panel = document.getElementById('xpal-panel');
    for (let el of panel.getElementsByTagName('*')) {
        el.removeEventListener('mouseover', inspectHandler);
    }
    panel.removeEventListener('mouseover', inspectHandler);
}

function stopInspect() {
    for (let el of document.getElementsByTagName('*')) {
        el.removeEventListener('mouseover', inspectHandler);
    }
}

let relativelyPrev = null;
let relativelyPrevListener = null;

function relativelyInspectHandler(event) {
    if (relativelyPrev) {
        relativelyPrev.removeAttribute('data-xpal');
        relativelyPrev.removeEventListener('click', relativelyPrevListener);
        relativelyPrev = null;
    }
    if (event.currentTarget) {
        relativelyPrev = event.currentTarget;
        relativelyPrevListener = listenOnce(event.currentTarget, 'click', relativelyClickHandler);
        relativelyPrev.setAttribute('data-xpal', 'xpath-relative-inspecting');
    }
    event.stopPropagation();
}

function relativelySelectDom(dom) {
    dom.removeAttribute('data-xpal');
    let possibleXpaths = X.findPossibleXpaths(dom); 
    possibleXpaths = possibleXpaths.filter(item => item.startsWith(vm.verifyXpathVal));
    for (let elementXpath of possibleXpaths) {
        try {
          let matchCount = X.selectElements(elementXpath).length;
          vm.xpaths.unshift({
              elementXpath,
              elementRelativelyXpath: elementXpath.replace(vm.verifyXpathVal, ''),
              matchCount
          });
        } catch (e) {
          console.warn(`${elementXpath} is not valid`);
        }
    }
    dom.setAttribute('data-xpal', 'xpath-relative-selected')
}


function relativelyClickHandler(event) {
    relativelySelectDom(event.currentTarget);
    stopRelativelyInspect();
    relativelyInspecting = false;
    vm.relativelyInspectButton = "Start Relatively Inspect";
    event.stopImmediatePropagation();
    event.preventDefault();
}

function startRelativelyInspect() {
    for (let el of document.querySelectorAll('[data-xpal^=xpath-relative]')) {
        el.removeAttribute('data-xpal');
    }
    for (let selectedEl of vm.selectedDom) {
        for (let el of selectedEl.querySelectorAll('*')) {
            el.addEventListener('mouseover', relativelyInspectHandler);
        }
    }
}

function stopRelativelyInspect() {
    for (let el of document.getElementsByTagName('*')) {
        el.removeEventListener('mouseover', relativelyInspectHandler);
    }
}

/******************************************************************************
 * 切换选中dom
 *****************************************************************************/

document.onkeydown = function(e) {
    if (e.shiftKey) {
        if (e.keyCode === 38) { // up
            keydownUP();
        } else if (e.keyCode === 40) { // down
            keydownDown();
        } else if (e.keyCode === 37) { // left
            keydownLeft();
        } else if (e.keyCode === 39) { // right
            keydownRight();
        }
    }
};

function getSelectedDom () {
    let dom;
    if (vm.isRelative) {
        dom = document.querySelector('[data-xpal=xpath-relative-selected]');
    } else {
        dom = document.querySelector('[data-xpal=xpath-selected]');
    }
    return dom;
}

function keydownUP() {
    const selectedDom = getSelectedDom();
    if (!selectedDom) {
        return;
    }
    const parentDom = selectedDom.parentNode;
    if (!parentDom) {
        return;
    }
    if (vm.isRelative) {
        if (parentDom.getAttribute('data-xpal') === 'xpath-verify-selected') {
            return;
        }
    } else {
        if (parentDom.nodeName === 'BODY' || parentDom.nodeName === 'HTML') {
            return;
        }
    }
    selectedDom.removeAttribute('data-xpal');
    if (vm.isRelative) {
        relativelySelectDom(parentDom);
    } else {
        selectDom(parentDom);
    }
};

function keydownDown() {
    const selectedDom = getSelectedDom();
    if (!selectedDom) {
        return;
    }
    const firstChildDom = selectedDom.firstElementChild;
    if (!firstChildDom) {
        return;
    }
    selectedDom.removeAttribute('data-xpal');
    if (vm.isRelative) {
        relativelySelectDom(firstChildDom);
    } else {
        selectDom(firstChildDom);
    }
};

function keydownLeft() {
    const selectedDom = getSelectedDom();
    if (!selectedDom) {
        return;
    }
    const preDom = selectedDom.previousElementSibling;
    if (!preDom) {
        return;
    }
    if (preDom.nodeName === 'SCRIPT' || preDom.id === 'xpal-panel') {
        return;
    }
    selectedDom.removeAttribute('data-xpal');
    if (vm.isRelative) {
        relativelySelectDom(preDom);
    } else {
        selectDom(preDom);
    }
};

function keydownRight() {
    const selectedDom = getSelectedDom();
    if (!selectedDom) {
        return;
    }
    const nextDom = selectedDom.nextElementSibling;
    if (!nextDom) {
        return;
    }
    if (nextDom.nodeName === 'SCRIPT' || nextDom.id === 'xpal-panel') {
        return;
    }
    selectedDom.removeAttribute('data-xpal');
    if (vm.isRelative) {
        relativelySelectDom(nextDom);
    } else {
        selectDom(nextDom);
    }
};

/******************************************************************************
 * Drag and Drop of Xpath Generator Panel
 *****************************************************************************/


/**
 * make element dragable by its element
 */
function makeDragable(dragHandle, dragTarget) {
  let dragObj = null; //object to be moved
  let xOffset = 0; //used to prevent dragged object jumping to mouse location
  let yOffset = 0;

  document.querySelector(dragHandle).addEventListener("mousedown", startDrag, true);
  document.querySelector(dragHandle).addEventListener("touchstart", startDrag, true);

  /*sets offset parameters and starts listening for mouse-move*/
  function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    dragObj = document.querySelector(dragTarget);
    dragObj.style.position = "fixed";
    let rect = dragObj.getBoundingClientRect();

    if (e.type=="mousedown") {
      xOffset = e.clientX - rect.left; //clientX and getBoundingClientRect() both use viewable area adjusted when scrolling aka 'viewport'
      yOffset = e.clientY - rect.top;
      window.addEventListener('mousemove', dragObject, true);
    } else if(e.type=="touchstart") {
      xOffset = e.targetTouches[0].clientX - rect.left;
      yOffset = e.targetTouches[0].clientY - rect.top;
      window.addEventListener('touchmove', dragObject, true);
    }
  }

  /*Drag object*/
  function dragObject(e) {
    e.preventDefault();
    e.stopPropagation();

    if(dragObj == null) {
      return; // if there is no object being dragged then do nothing
    } else if(e.type=="mousemove") {
      dragObj.style.left = e.clientX-xOffset +"px"; // adjust location of dragged object so doesn't jump to mouse position
      dragObj.style.top = e.clientY-yOffset +"px";
      dragObj.style.right = 'auto';
    } else if(e.type=="touchmove") {
      dragObj.style.left = e.targetTouches[0].clientX-xOffset +"px"; // adjust location of dragged object so doesn't jump to mouse position
      dragObj.style.top = e.targetTouches[0].clientY-yOffset +"px";
    }
  }

  /*End dragging*/
  document.onmouseup = function(e) {
    if (dragObj) {
      dragObj = null;
      window.removeEventListener('mousemove', dragObject, true);
      window.removeEventListener('touchmove', dragObject, true);
    }
  }
}

makeDragable('#xpal-title-bar', '#xpal-panel')

})(window);

/* this code should be in the content script */
/*
chrome.runtime.onMessage.addListener((message, sender, sendMessage) => {
    togglePanel();
    console.log('toggleing panel');
})
*/
