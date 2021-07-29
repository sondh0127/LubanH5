import ShortcutButton from './shortcut-button'
import UsageTip from './usage-tip'
import LoadNpmPlugins from './load-npm-plugins.vue'
import langMixin from 'core/mixins/i18n'
import loadPluginsMixin from 'core/plugins/index'
import {
  defineComponent,
  reactive,
  toRefs,
  ref,
  computed
} from '@vue/composition-api'

let dragDom = null

let dragConfig = {
  isPreDrag: false, // Prepare to drag
  isDrag: false, // Official drag
  origin: {
    clientY: 0, // When the mouse is pressed down
    clientX: 0,
    layerX: 0, // Mouse. X relative to the upper left corner of the element .left offset
    layerY: 0 // The mouse. Y is offset from the upper left corner of the element. TOP
  }
}

export default defineComponent({
  mixins: [langMixin, loadPluginsMixin],
  props: { elementManager: Function },
  setup(props) {
    const state = reactive({
      npmPackages: []
    })

    const dragElement = ref(null)

    console.log('🇻🇳 ~ file: index.js ~ line 76 ~ root.$store', root.$store)
    function mousedown(e) {
      // Mouse. X is relative to the offset of the upper left corner of the element
      const { layerX, layerY } = e
      dragConfig.origin.layerX = layerX
      dragConfig.origin.layerY = layerY
      dragConfig.origin.clientX = e.clientX
      dragConfig.origin.clientY = e.clientY

      dragDom.style.position = 'absolute'
      dragDom.style.left = e.clientX - layerX + 'px'
      dragDom.style.top = e.clientY - layerY + 'px'
      dragDom.classList.add('dragging-dom-ele', 'hidden')

      dragConfig.isPreDrag = true
    }

    function mousemove(e) {
      dragDom.classList.remove('hidden')
      const { layerX, layerY } = dragConfig.origin
      dragDom.style.left = e.clientX - layerX + 'px'
      dragDom.style.top = e.clientY - layerY + 'px'
    }

    function checkCanMousedown(e, { minOffsetX, minOffsetY, minOffset }) {
      const offsetX = e.clientX - dragConfig.origin.clientX
      const offsetY = e.clientY - dragConfig.origin.clientY

      return (
        offsetX >= (minOffsetX || minOffset) ||
        offsetY >= (minOffsetY || minOffset)
      )
    }

    function clone(elementShortcutConfig) {
      props.elementManager({
        type: 'add',
        value: elementShortcutConfig
      })
    }

    function mouseup(e) {
      const { layerX, layerY } = dragConfig.origin
      document.body.removeChild(dragDom)
      dragDom = null

      const canMousedown = checkCanMousedown(e, { minOffset: 10 })
      if (!canMousedown) return

      const canvasWrapper = document.querySelector('.canvas-wrapper')
      const position = canvasWrapper.getBoundingClientRect()
      dragElement.value &&
        clone({
          ...dragElement.value,
          dragStyle: {
            left: e.clientX - layerX - position.left,
            top: e.clientY - layerY - position.top
          }
        })
    }

    function handleDragStartFromMixin(element, e) {
      if (e.button !== 0) return
      if (dragDom) {
        document.body.removeChild(dragDom)
        dragDom = null
      }
      dragElement.value = element
      dragDom = e.target.cloneNode(true)
      document.body.appendChild(dragDom)

      const handleMouseMove = evt => {
        mousemove(evt)
      }

      const handleMouseUp = evt => {
        mouseup(evt)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      mousedown(e)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return {
      ...toRefs(state),
      handleDragStartFromMixin,
      clone
    }
  },

  methods: {
    // ...mapActions('editor', [
    //   'elementManager',
    //   'pageManager',
    //   'saveWork',
    //   'setEditingPage'
    // ]),
    // ...mapActions('loading', {
    //   updateLoading: 'update'
    // })
  },

  render(h) {
    // return this.renderShortCutsPanel(this.groups)
    return (
      <a-row
        gutter={10}
        style="max-height: calc(100vh - 150px);overflow: auto;margin:0;"
      >
        <UsageTip />
        {[]
          .concat(this.pluginsList, this.npmPackages)
          .filter(plugin => plugin.visible)
          .map(plugin => (
            <a-col span={12} style={{ marginTop: '10px' }}>
              <ShortcutButton
                clickFn={this.clone.bind(this, plugin)}
                mousedownFn={e => this.handleDragStartFromMixin(plugin, e)}
                // title={plugin.title}
                title={plugin.i18nTitle[this.currentLang] || plugin.title}
                faIcon={plugin.icon}
                disabled={plugin.disabled}
              />
            </a-col>
          ))}
        <LoadNpmPlugins
          onLoadComplete={npmPackages => {
            this.npmPackages = npmPackages
          }}
        />
      </a-row>
    )
  }
})
