define(['controller/selectionController', 'model/cacheModel', 'model/buyerMasterModel', 'component/_CRUDComponent', 'controller/tabController', 'component/buyerComponent',
 'component/creditCardComponent', 'component/addressComponent'],
 function(SelectionController, CacheModel, BuyerMasterModel, CRUDComponent, TabController, BuyerComponent,
 creditCardComponent, addressComponent) {
    App.Component.CompositeMasterComponent = App.Component.BasicComponent.extend({
        initialize: function() {
            var self = this;
            this.configuration = App.Utils.loadComponentConfiguration('buyerMaster');
            App.Model.BuyerMasterModel.prototype.urlRoot = this.configuration.context;
            this.componentId = App.Utils.randomInteger();
            
            this.masterComponent = new BuyerComponent();
            this.masterComponent.initialize();
            
            this.childComponents = [];
			
			this.initializeChildComponents();
            
            Backbone.on(this.masterComponent.componentId + '-post-buyer-create', function(params) {
                self.renderChilds(params);
            });
            Backbone.on(this.masterComponent.componentId + '-post-buyer-edit', function(params) {
                self.renderChilds(params);
            });
            Backbone.on(this.masterComponent.componentId + '-pre-buyer-list', function() {
                self.hideChilds();
            });
            Backbone.on('buyer-master-model-error', function(error) {
                Backbone.trigger(uComponent.componentId + '-' + 'error', {event: 'buyer-master-save', view: self, message: error});
            });
            Backbone.on(this.masterComponent.componentId + '-instead-buyer-save', function(params) {
                self.model.set('buyerEntity', params.model);
                if (params.model) {
                    self.model.set('id', params.model.id);
                } else {
                    self.model.unset('id');
                }

                App.Utils.fillCacheList(
                        'creditCard',
                        self.model,
                        self.creditCardComponent.getDeletedRecords(),
                        self.creditCardComponent.getUpdatedRecords(),
                        []
                );

                App.Utils.fillCacheList(
                        'address',
                        self.model,
                        self.addressComponent.getDeletedRecords(),
                        self.addressComponent.getUpdatedRecords(),
                        []
                );

                self.model.save({}, {
                    success: function() {
                        var addresses = self.addressComponent.getCreatedRecords();
                        for (i = 0; i < addresses.length; i++) {
                            var addressModel = new App.Model.AddressModel();
                            addressModel.set(addresses[i]);
                            addressModel.save();
                        }
                        var creditCards = self.creditCardComponent.getCreatedRecords();
                        for (i = 0; i < creditCards.length; i++) {
                            var creditCardModel = new App.Model.CreditCardModel();
                            creditCardModel.set(creditCards[i]);
                            creditCardModel.save();
                        }
                        Backbone.trigger(self.masterComponent.componentId + '-' + 'post-buyer-save', {view: self, model : self.model});
                    },
                    error: function(error) {
                        Backbone.trigger(self.componentId + '-' + 'error', {event: 'buyer-master-save', view: self, error: error});
                    }
                });
			    if (this.postInit) {
					this.postInit();
				}
            });
            this.setupBuyerComponent();
        },
        render: function(domElementId){
			if (domElementId) {
				var rootElementId = $("#"+domElementId);
				this.masterElement = this.componentId + "-master";
				this.tabsElement = this.componentId + "-tabs";

				rootElementId.html("<div id='" + this.masterElement + "'></div>" + "<div id='" + this.tabsElement + "'></div>");
			}
			this.masterComponent.render(this.masterElement);
		},
		initializeChildComponents: function () {
			this.tabModel = new App.Model.TabModel({tabs: [
                {label: "Credit Card", name: "creditCard", enable: true},
                {label: "Address", name: "address", enable: true}
			]});
			this.tabs = new TabController({model: this.tabModel});

			this.creditCardComponent = new creditCardComponent();
            this.creditCardComponent.initialize({cache: {data: [], mode: "memory"},pagination: false});
			this.childComponents.push(this.creditCardComponent);

			this.addressComponent = new addressComponent();
            this.addressComponent.initialize({cache: {data: [], mode: "memory"},pagination: false});
			this.childComponents.push(this.addressComponent);

            var self = this;
            
            this.configToolbar(this.creditCardComponent,true);
            Backbone.on(self.creditCardComponent.componentId + '-post-creditCard-create', function(params) {
                params.view.currentModel.setCacheList(params.view.currentList);
            });
            
            this.configToolbar(this.addressComponent,true);
            Backbone.on(self.addressComponent.componentId + '-post-address-create', function(params) {
                params.view.currentModel.setCacheList(params.view.currentList);
            });
            
		},
        renderChilds: function(params) {
            var self = this;
            
            var options = {
                success: function() {
                	self.tabs.render(self.tabsElement);

					self.creditCardComponent.clearCache();
					self.creditCardComponent.setRecords(self.model.get('listcreditCard'));
					self.creditCardComponent.render(self.tabs.getTabHtmlId('creditCard'));

					self.addressComponent.clearCache();
					self.addressComponent.setRecords(self.model.get('listaddress'));
					self.addressComponent.render(self.tabs.getTabHtmlId('address'));

                    $('#'+self.tabsElement).show();
                },
                error: function() {
                    Backbone.trigger(self.componentId + '-' + 'error', {event: 'buyer-edit', view: self, id: id, data: data, error: error});
                }
            };
            if (params.id) {
                self.model = new App.Model.BuyerMasterModel({id: params.id});
                self.model.fetch(options);
            } else {
                self.model = new App.Model.BuyerMasterModel();
                options.success();
            }


        },
        showMaster: function (flag) {
			if (typeof (flag) === "boolean") {
				if (flag) {
					$("#"+this.masterElement).show();
				} else {
					$("#"+this.masterElement).hide();
				}
			}
		},
        hideChilds: function() {
            $("#"+this.tabsElement).hide();
        },
		configToolbar: function(component, composite) {
		    component.removeGlobalAction('refresh');
			component.removeGlobalAction('print');
			component.removeGlobalAction('search');
			if (!composite) {
				component.removeGlobalAction('create');
				component.removeGlobalAction('save');
				component.removeGlobalAction('cancel');
				component.addGlobalAction({
					name: 'add',
					icon: 'glyphicon-send',
					displayName: 'Add',
					show: true
				}, function () {
					Backbone.trigger(component.componentId + '-toolbar-add');
				});
			}
        },
        getChilds: function(name){
			for (var idx in this.childComponents) {
				if (this.childComponents[idx].name === name) {
					return this.childComponents[idx].getRecords();
				}
			}
		},
		setChilds: function(childName,childData){
			for (var idx in this.childComponents) {
				if (this.childComponents[idx].name === childName) {
					this.childComponents[idx].setRecords(childData);
				}
			}
		},
		renderMaster: function(domElementId){
			this.masterComponent.render(domElementId);
		},
		renderChild: function(childName, domElementId){
			for (var idx in this.childComponents) {
				if (this.childComponents[idx].name === childName) {
					this.childComponents[idx].render(domElementId);
				}
			}
		},
                setupBuyerComponent: function() {
            this.masterComponent.addGlobalAction({
                name: 'Windows',
                icon: 'glyphicon-user',
                displayName: 'Windows',
                show: true,
                menu: 'utils'
            },
            this.windows,
            this);
            
            this.masterComponent.addGlobalAction({
                name: 'Facebook',
                icon: 'glyphicon-user',
                displayName: 'Facebook',
                show: true,
                menu: 'utils'
            },
            this.facebook,
            this);
            
            this.masterComponent.addGlobalAction({
                name: 'Google',
                icon: 'glyphicon-user',
                displayName: 'Google',
                show: true,
                menu: 'utils'
            },
            this.google,
            this);
        },
         windows: function() {       
                  
            hello.init({ 
                'windows' : '00000000401357CD'                
            },
            {
               scope : 'email',
               oauth_proxy: 'https://auth-server.herokuapp.com/proxy'
            });               
           
	
	 //call user information, for the given network
	 hello('windows').login().then(function(){
             //alert("You are signed in to Windows");
                hello('windows').api('/me').then(function(response){       
                    $("#username").val(response.email);
                    $("#email").val(response.email);
                    $("#name").val(response.name);
                    $("#firstName").val(response.first_name);
                    $("#lastName").val(response.last_name);
                    $("#gender").val(response.gender);
                     //alert(response.email+", "+response.first_name+", "+response.last_name+", "+response.gender);
                });
            }, function(e){
                alert("Error al Autenticar: " + e.error.message);
            });
       },
        facebook: function() {
            hello.init({
                'facebook' : '597983760329002'
            },
            {
                scope : 'email',
                oauth_proxy: 'https://auth-server.herokuapp.com/proxy'
            });
            hello('facebook').login().then(function(){
                hello('facebook').api('/me').then(function(response){
                    $("#username").val(response.email);
                    $("#email").val(response.email);
                    $("#name").val(response.name);
                    $("#firstName").val(response.first_name);
                    $("#lastName").val(response.last_name);
                    $("#gender").val(response.gender);
                });
            }, function(e){
                alert("Error al Autenticar: " + e.error.message);
            });
        },
        google: function() {
            hello.init({
                'google' : '491584393580-kslq1aoen62du8rhgmlepdhudg12ldbb.apps.googleusercontent.com'
            },
            {
                scope : 'email',
                oauth_proxy: 'https://auth-server.herokuapp.com/proxy'
            });
            hello('google').login().then(function(){
                hello('google').api('/me').then(function(response){
                    $("#username").val(response.email);
                    $("#email").val(response.email);
                    $("#name").val(response.name);
                    $("#firstName").val(response.first_name);
                    $("#lastName").val(response.last_name);
                    $("#gender").val(response.gender);
                });
            }, function(e){
                alert("Error al Autenticar: " + e.error.message);
            });
        }
    });

    return App.Component.CompositeMasterComponent;
});