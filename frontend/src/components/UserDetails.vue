<!--suppress XmlInvalidId -->
<template>
  <div id="user">
    <v-card outlined class="subgroup">
      <h2>User Details</h2>
      <v-row no-gutters>
        <v-col class="col-7">
          <v-form ref="form">
            <label for="user-name" :disabled="!!userId || !editUserDetailsPermission" class="required">Username</label>
            <v-tooltip right v-if="!userId">
              <template v-slot:activator="{ on }">
                <v-icon id="user-name-tooltip-icon" v-on="on" small>mdi-help-circle</v-icon>
              </template>
              <span>Username should include the corresponding prefix or suffix in alignment with the id type.
                <ul>
                  <li>IDIR: username<strong>@idir</strong></li>
                  <li>Business BCeID: username<strong>@business_bceid</strong></li>
                  <li>Fraser Health: <strong>sfhr\</strong>username</li>
                  <li>Interior Health: <strong>iha\</strong>username</li>
                  <li>Northern Health: <strong>nirhb\</strong>username</li>
                  <li>Provincial Health: <strong>phsabc\</strong>username</li>
                  <li>Vancouver Coastal Health: <strong>vch\</strong>username or <strong>vrhb\</strong>username</li>
                  <li>Vancouver Island Health: <strong>viha\</strong>username</li>
                </ul>
              </span>
            </v-tooltip>
            <v-text-field
              dense
              :disabled="!!userId || !editUserDetailsPermission"
              outlined
              id="user-name"
              v-model="user.username"
              required
              :rules="[v => !!v || 'Username is required']"
            />

            <label :disabled="!editUserDetailsPermission" for="first-name" class="required">First Name</label>
            <v-text-field
              dense
              outlined
              :disabled="!editUserDetailsPermission"
              id="first-name"
              v-model="user.firstName"
              required
              :rules="[v => !!v || 'First Name is required']"
            />

            <label :disabled="!editUserDetailsPermission" for="last-name" class="required">Last Name</label>
            <v-text-field
              dense
              outlined
              :disabled="!editUserDetailsPermission"
              id="last-name"
              v-model="user.lastName"
              required
              :rules="[v => !!v || 'Last Name is required']"
            />

            <label :disabled="!editUserDetailsPermission" for="email" class="required">Email Address</label>
            <v-text-field
              dense
              outlined
              :disabled="!editUserDetailsPermission"
              id="email"
              v-model="user.email"
              required
              :rules="emailRules"
              type="email"
            />

            <label :disabled="!editUserDetailsPermission" for="phone">Telephone Number</label>
            <v-text-field dense outlined :disabled="!editUserDetailsPermission" id="phone" v-model="user.attributes.phone" />

            <label :disabled="!editUserDetailsPermission" for="org-details">Organization</label>
            <v-autocomplete
                id="org-details"
                :disabled="!editUserDetailsPermission"
                v-model="user.attributes.org_details"
                :items="organizations"
                dense
                outlined
            ></v-autocomplete>

            <label :disabled="!editUserDetailsPermission" for="notes">Notes</label>
            <v-textarea outlined dense id="notes" :disabled="!editUserDetailsPermission" v-model="user.attributes.access_team_notes" maxlength="255" />

          </v-form>
        </v-col>
        <v-col class="col-4" style="margin-left: 30px; padding-left: 20px; border-left: 1px solid #efefef">
          <label for="linked-idps">Linked Identity Types</label>
          <ul id="linked-idps" style="margin-top: 5px; list-style: square">
            <li v-for="identity in user.federatedIdentities" :key="identity.id">
              {{ identity.identityProvider | formatIdentityProvider }} [{{ identity.userName }}]
            </li>
          </ul>
          <br/><br/>
          <label for="all-roles">Application Roles and Last Login</label>
          <v-skeleton-loader
              ref="roleSkeleton"
              v-show="!rolesLoaded"
              type="list-item@5">
          </v-skeleton-loader>
          <div id="user-roles" v-show="rolesLoaded">          
            <ul id="all-roles" style="margin-top: 5px; list-style: square">
              <li v-for="client in allRoles" :key="client.clientName">
                {{client.clientName}} [{{client.effectiveRoles.map(role => role.name).join(", ")}}] {{client.lastLogin}}
              </li>
            </ul>
          </div>
        </v-col>
      </v-row>
      <v-btn id="submit-button" v-if="editUserDetailsPermission" class="primary" medium @click="updateUser">{{ updateOrCreate }} User</v-btn>
    </v-card>
  </div>
</template>

<script>
import UsersRepository from "@/api/UsersRepository";
import app_config from '@/loadconfig';
import clients from "@/api/ClientsRepository";

export default {
  name: "UserDetails",
  props: ['userId', 'updateOrCreate'],
  data() {
    return {
      organizations: app_config.organizations.map((item) => {
        item.value = `{"id":"${item.id}","name":"${item.name}"}`
        item.text = `${item.id} - ${item.name}`;
        return item;
      }),
      emailRules: [
        v => !!v || "Email is required",
        v => /^\S+@\S+$/.test(v) || "Email is not valid"
      ],
      user: {
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        enabled: true,
        attributes: {
          phone: null,
          org_details: null,
          access_team_notes: null
        },
        
        federatedIdentities: null
      },
      allRoles: null,
      rolesLoaded: false
    };
  },
  async created() {
    //Create global ref to allow role update from UserUpdateRoles
    this.$root.$refs.UserDetails = this;
    // TODO error handling
    this.$store.commit("user/resetState");
    if (this.userId) {
      await this.getUser();
      await this.loadUserRoles();
    }
  },
  computed: {
    editUserDetailsPermission: function() {
      const onCreateUserPage = !this.userId;

      const umsClientId = "USER-MANAGEMENT-SERVICE";
      const manageUserDetailsRoleName = "manage-user-details";
      const createUserRoleName = "create-user";

      const hasManageUserDetails = this.$keycloak.tokenParsed.resource_access[umsClientId].roles.includes(manageUserDetailsRoleName);
      const hasCreateUser = this.$keycloak.tokenParsed.resource_access[umsClientId].roles.includes(createUserRoleName);

      if (onCreateUserPage && hasCreateUser) {
        return true
      } else if (!onCreateUserPage && hasManageUserDetails) {
        return true
      }
      return false
    }
  },
  methods: {
    getUser: function() {
      return UsersRepository.getUser(this.userId)
        .then(response => {
          this.user = response.data;

          if (!this.user.attributes) {
            this.user.attributes = {}
          }

          // Keycloak returns attributes as arrays which doesn't work with the autocomplete for org details
          if (this.user.attributes.org_details) {
            this.user.attributes.org_details = formatOrganization(this.user.attributes.org_details);
          }
          this.$store.commit("user/setUser", this.user);
        })
        .catch(e => {
          console.log(e);
        });
    },
    loadUserRoles: function() {    
      this.allRoles = [];
      this.rolesLoaded = false;
      let vueObj = this;
      let lastLoginMap = [];
      UsersRepository.getUserLogins(this.userId).then(lastLogins => {
        lastLoginMap = lastLogins.data;
      });
      /*
      No API call exists to load all roles for a user, so we need to first query
      for a list of clients, then load the roles for each client one by one
      */          
      clients.get().then(allClients => {  
        Promise.all(      
          allClients.data.map(client => {
              return UsersRepository.getUserEffectiveClientRoles(this.userId,client.id)
                     .then(clientRoles =>{
                        clientRoles["clientName"] = client.name; 
                        return clientRoles;
                      });
            })
          ).then(function(rolesArray) {
            rolesArray.forEach(clientRoles =>{
                if (clientRoles.data.length>0){
                  let lastLoginStr = "- N/A";
                  if (lastLoginMap[clientRoles.clientName]){
                    lastLoginStr = "- "+new Date(lastLoginMap[clientRoles.clientName]).toLocaleDateString("en-CA");
                  }
                  vueObj.allRoles.push({clientName: clientRoles.clientName, effectiveRoles:clientRoles.data, lastLogin: lastLoginStr});                
                }
            });            
            vueObj.allRoles.sort((a, b) => a.clientName.localeCompare(b.clientName, undefined, {sensitivity: 'base'}))
            vueObj.rolesLoaded = true;
          });           
        });
    },
    updateUser: function() {
      // Validate the User Details
      if (!this.$refs.form.validate()) {
        this.$store.commit("alert/setAlert", {
          message: "Please correct errors before submitting",
          type: "error"
        });
        window.scrollTo(0, 0);
        return;
      }
      this.$emit('submit-user-updates', this.user)
    }
  },
  filters: {
    // The IDP alias in keycloak doesn't always match what's known by users
    // Formatted to match standard naming conventions
    formatIdentityProvider: function(idp) {
      let formattedIdentityProviders = {
        'phsa': 'Health Authority',
        'moh_idp': 'MoH LDAP',
        'idir': 'IDIR',
        'idir_aad': 'IDIR AzureAD',
        'bceid': 'BCeID',
        'bcsc': 'BCSC'
      }
      return formattedIdentityProviders[idp] || idp;
    }
  }
};
function formatOrganization(organization) {
  if (Array.isArray(organization)) {
    return organization[0];
  } else {
    return organization;
  }
}
</script>

<style scoped>
#user-name-tooltip-icon {
  margin-left: 10px;
}
</style>
