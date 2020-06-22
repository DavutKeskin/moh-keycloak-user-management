import Vue from 'vue'
import VueRouter from 'vue-router'
import Users from '../views/Users.vue'
import UserSearch from '../components/UserSearch.vue'
import UserInfo from '../components/UserInfo.vue'
import EventLog from '../views/EventLog.vue'
import AdminEventLog from '../views/AdminEventLog.vue'

Vue.use(VueRouter)

const routes = [
  {path: '/', redirect: '/users'},
  {
    path: '/users',
    component: Users,
    children: [
      {
        path: '',
        component: UserSearch,
        name: 'UserSearch'
      },
      {
        path: ':userid',
        component: UserInfo,
        name: 'UserInfo'
      }
    ]
  },
  {
    path: '/event-log',
    name: 'EventLog',
    component: EventLog
  },
  {
    path: '/admin-event-log',
    name: 'AdminEventLog',
    component: AdminEventLog
  }
]

const router = new VueRouter({
  routes
})

export default router
