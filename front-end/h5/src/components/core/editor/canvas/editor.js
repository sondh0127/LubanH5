import { defineStore } from 'pinia'
import { swapZindex, getVM } from '@/utils/element'
import LocalPreferences, { IS_CONFIRM_BEFORE_DELETE_ELEMENT } from 'core/editor/left-panel/preferences/local-preferences.js'
import { Modal, message } from 'ant-design-vue'
import i18n from '@/locales'
import Work from 'core/models/work'
import Page from 'core/models/page'
import Element from 'core/models/element'
import strapi from '@/utils/strapi'
import { AxiosWrapper, handleError } from '@/utils/http.js'
import { takeScreenshot, downloadPoster } from '@/utils/canvas-helper.js'
import Datasource from 'core/models/data-source'
import Vue from 'vue'

function setLoading (commit, loadingName, isLoading) {
  commit('loading/update', { type: loadingName, payload: isLoading }, { root: true })
}

const confirmDelete = () => new Promise((resolve, reject) => {
  if (LocalPreferences.get(IS_CONFIRM_BEFORE_DELETE_ELEMENT)) {
    Modal.confirm({
      title: i18n.t('workCard.confirmDeleteTip', { tip: `` }),
      onOk: (close) => {
        resolve()
        close()
      }
    })
    return
  }
  resolve()
})
export const LuBanDC = Vue.observable({ DC: {} })

export const useEditor = defineStore({
  id: 'storeId',
  state: () => ({
    editingPage: { elements: [] },
    editingElement: null,
    works: [],
    work: new Work(),
    formDetailOfWork: {
      uuidMap2Name: {},
      formRecords: []
    },
    workTemplates: [],
    scaleRate: 1,
    scripts: []
  }),
  actions: {
    // Element
    setEditingElement (payload) {
      this.editingElement = payload
      payload && window.EditorApp.$emit('setEditingElement', payload)
    },
    setElementPosition (payload) {
      this.editingElement.commonStyle = {
        ...this.editingElement.commonStyle,
        ...payload
      }
    },
    setElementShape (payload) {
      this.editingElement.commonStyle = {
        ...this.editingElement.commonStyle,
        ...payload
      }
    },
    recordElementRect (payload) {
    },
    elementManager (payload) {
      const { type, value } = payload
      const elementShortcutConfig = value
      const { editingPage, editingElement } = this
      const elements = editingPage.elements
      const len = elements.length

      switch (type) {
        case 'add':
          const vm = getVM(value.name)
          const basicElement = vm.$options
          const element = new Element({
            ...basicElement,
            ...elementShortcutConfig,
            zindex: len + 1
          })
          elements.push(element)
          break
        case 'copy':
          elements.push(this.editingElement.clone({ zindex: len + 1 }))
          break
        case 'delete':
          {
            const index = elements.findIndex(e => e.uuid === editingElement.uuid)
            if (index !== -1) {
              confirmDelete().then(() => {
                this.editingPage.elements.splice(index, 1)
              })
            }
            this.editingElement = null
          }
          break
        case 'move2Top':
        case 'move2Bottom':
          {
            const index = elements.findIndex(e => e.uuid === editingElement.uuid)
            elements.splice(index, 1)
            const newElements = type === 'move2Top' ? [...elements, editingElement] : [editingElement, ...elements]
            newElements.forEach((ele, i, arr) => {
              ele.commonStyle.zindex = i + 1
            })
            this.editingPage.elements = newElements
          }
          break
        case 'addZindex':
        case 'minusZindex':
          const maxZindex = elements.length
          const eleZindex = editingElement.commonStyle.zindex
          if (eleZindex === maxZindex || eleZindex === 1) return

          const flag = type === 'addZindex' ? 1 : -1
          const swapElement = elements.find(ele => ele.commonStyle.zindex === eleZindex + flag * 1)
          swapZindex(editingElement, swapElement)
          break
        default:
      }
    },
    // Page
    setEditingPage (pageIndex = 0) {
      this.editingPage = this.work.pages[pageIndex]
    },
    pageManager (payload) {
      const { type, value } = payload
      switch (type) {
        case 'editTitle':
          const { pageIndex, newTitle } = value
          this.work.pages[pageIndex].title = newTitle
          break
        case 'add':
          const page = new Page(value)
          this.work.pages.push(page)
          break
        case 'copy':
          this.work.pages.push(this.editingPage.clone())
          break
        case 'delete':
          if (this.work.pages.length === 1) {
            // #!en: At least one page needs to be kept in the work
            message.info(`At least one page needs to be retained in the work`)
            return
          }

          const { work, editingPage } = this
          let index = work.pages.findIndex(page => page.uuid === editingPage.uuid)
          if (index !== -1) {
            let newPages = work.pages.slice()
            newPages.splice(index, 1)
            this.work.pages = newPages
          }
          break
        default:
      }
    },
    // Work
    previewWork (payload) {
    },
    deployWork (payload) {
    },
    updateWork (payload = {}) {
      const work = {
        ...this.work,
        ...payload
      }
      window.__work = work
      work.pages = work.pages.map(page => {
        page.elements = page.elements.map(element => new Element(element))
        return new Page(page)
      })
      this.work = new Work(work)
    },
    saveWork ({ commit, dispatch, state }, { isSaveCover = false, loadingName = 'saveWork_loading', successMsg = '保存作品成功' } = {}) {
      const fn = (callback) => {
        new AxiosWrapper({
          dispatch,
          commit,
          loading_name: loadingName,
          successMsg,
          customRequest: strapi.updateEntry.bind(strapi)
        }).put('works', state.work.id, state.work).then(callback)
      }
      return new Promise((resolve, reject) => {
        if (isSaveCover) {
          setLoading(commit, 'uploadWorkCover_loading', true)
          takeScreenshot().then(file => {
            dispatch('uploadCover', { file }).then(() => {
              setLoading(commit, 'uploadWorkCover_loading', false)
              fn(resolve)
            }) // uploadCover
          }) // takeScreenshot
        } else {
          fn(resolve)
        }
      })
    },
    fetchWork ({ commit, dispatch, state }, workId) {
      return strapi.getEntry('works', workId).then(entry => {
        commit('setWork', entry)
        commit('setEditingPage')
      }).catch(handleError)
    },
    setWorkAsTemplate ({ commit, state, dispatch }, workId) {
      new AxiosWrapper({
        dispatch,
        commit,
        // name: 'editor/formDetailOfWork',
        loading_name: 'setWorkAsTemplate_loading',
        successMsg: 'Set to the template success'
      }).post(`/works/set-as-template/${workId || state.work.id}`)
    },
    uploadCover ({ commit, state, dispatch }, { file } = {}) {
      const formData = new FormData()
      formData.append('files', file, `${+new Date()}.png`)
      formData.append('workId', state.work.id)
      return new AxiosWrapper({
        dispatch,
        commit,
        name: 'editor/setWorkCover',
        loading_name: 'uploadWorkCover_loading',
        successMsg: 'Upload cover map success!'
      }).post(`/upload/`, formData)
    },
    downloadPoster ({ commit, state, dispatch }) {
      downloadPoster()
    },
    setWorkCover ({ type, value }) {
      const [cover] = value
      this.work.cover_image_url = cover.url
    },
    // Scripts
    fetchScripts ({ commit, dispatch, state }, payload = { _limit: 100 }) {
      return new AxiosWrapper({
        dispatch,
        commit,
        name: 'editor/setScripts',
        loading_name: 'fetchScripts_loading',
        successMsg: 'Get equipment (script) list successfully',
        customRequest: strapi.getEntries.bind(strapi)
      }).get('scripts', payload)
    },
    setScripts ({ type, value }) {
      this.scripts = value
    },

    // Data Source
    async dataSourceManager ({ type, value }) {
      const dataSourceOrigin = value

      function collectRelatedDataSource () {
        (dataSourceOrigin.dependencies || []).forEach(dependency => {
          const ds = this.work.datasources.find(ds => ds.name === dependency)
          if (ds) {
            if (ds.relatedDsList.indexOf(dataSourceOrigin.name)) return
            ds.relatedDsList.push(dataSourceOrigin.name)
          }
        })
      }

      function updateDs (ds) {
        const targetDsIdx = this.work.datasources.findIndex(item => item.id === ds.id)
        this.work.datasources.splice(targetDsIdx, 1, new Datasource(ds))
      }

      switch (type) {
        case 'editTitle':
          const { pageIndexForEditingTitle, newTitle } = value
          this.work.datasources[pageIndexForEditingTitle].title = newTitle
          break
        case 'edit':
          {
            collectRelatedDataSource()
            const dsWithId = await strapi.updateEntry('datasources', dataSourceOrigin.id, dataSourceOrigin)
            updateDs(dsWithId)
            break
          }
        case 'add':
          collectRelatedDataSource()
          const dsWithId = await strapi.createEntry('datasources', dataSourceOrigin)
          this.work.datasources.push(new Datasource(dsWithId))
          break
        case 'copy':
          this.work.datasources.push(this.editingPage.clone())
          break
        case 'delete':
          let index = this.work.datasources.findIndex(ds => ds.name === dataSourceOrigin.name)
          if (index !== -1) {
            this.work.datasources.splice(index, 1)
          }
          break
        default:
      }
    },
    saveDatasource ({ commit, dispatch, state }, { isSaveCover = false, loadingName = 'saveDatasource_loading', successMsg = 'Save data source' } = {}) {
        return new AxiosWrapper({
          dispatch,
          commit,
          loading_name: loadingName,
          successMsg,
          customRequest: strapi.updateEntry.bind(strapi)
        }).put('datasources', state.dataSource.id, state.dataSource)
    },
    createDatasource ({ commit, dispatch, state }, payload) {
        return new AxiosWrapper({
          dispatch,
          commit,
          successMsg: 'Create success',
          customRequest: strapi.createEntry('datasources')
        }).post('datasources', payload)
    },
    fetchDatasources ({ commit, dispatch, state }, workId) {
      new AxiosWrapper({
        dispatch,
        commit,
        name: 'editor/setDatasources',
        loading_name: 'fetchDatasources_loading',
        successMsg: 'Get successful data source',
        customRequest: strapi.getEntries.bind(strapi)
      }).get('datasources', { is_template: false })
    },
    updateDC (payload) {
      LuBanDC.DC = {
        ...LuBanDC.DC,
        ...payload
      }
    },
    setDatasource (dataSource) {
      window.__work = dataSource
      dataSource.pages = dataSource.pages.map(page => {
        page.elements = page.elements.map(element => new Element(element))
        return new Page(page)
      })
      this.dataSource = new Datasource(dataSource)
    }
  }
})
