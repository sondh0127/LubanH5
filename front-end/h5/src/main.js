import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store/'
import i18n from './locales'
import './plugins/index'
import VueCompositionAPI from '@vue/composition-api'
import { createPinia, PiniaPlugin } from 'pinia'

Vue.use(VueCompositionAPI)
Vue.use(PiniaPlugin)
const pinia = createPinia()

const app = new Vue({
  router,
  store,
  i18n,
  render: h => h(App),
  pinia
})
app.$mount('#app')
