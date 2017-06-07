/**
 2014-2016 ToManage

NOTICE OF LICENSE

This source file is subject to the Open Software License (OSL 3.0)
that is bundled with this package in the file LICENSE.txt.
It is also available through the world-wide-web at this URL:
http://opensource.org/licenses/osl-3.0.php
If you did not receive a copy of the license and are unable to
obtain it through the world-wide-web, please send an email
to license@tomanage.fr so we can send you a copy immediately.

DISCLAIMER

Do not edit or add to this file if you wish to upgrade ToManage to newer
versions in the future. If you wish to customize ToManage for your
needs please refer to http://www.tomanage.fr for more information.

@author    ToManage SAS <contact@tomanage.fr>
@copyright 2014-2016 ToManage SAS
@license   http://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
International Registered Trademark & Property of ToManage SAS
**/


"use strict";

var round = function(value, decimals) {
    if (value > Math.pow(10, (decimals + 2) * -1) * -1 && value < Math.pow(10, (decimals + 2) * -1)) // Fix error little number
        return 0;
    return Number(Math.round(value + 'e' + (decimals)) + 'e-' + (decimals));
};

/* global angular: true */
MetronicApp.controller('SuppliersController', ['$scope', '$rootScope', '$http', '$modal', '$filter', '$timeout', 'Suppliers',
    function($scope, $rootScope, $http, $modal, $filter, $timeout, Orders) {

        var grid = new Datatable();
        var user = $rootScope.login;
        var current;
        var Object;

        $scope.backTo = 'dashboard';

        $scope.object = {
            entity: $rootScope.login.entity,
            billing: {},
            address: {},
            lines: []
        };

        $scope.dict = {};
        var iconsFilesList = {};
        $scope.types = [{
            name: "En cours",
            id: "NOW"
        }, {
            name: "Clos",
            id: "CLOSED"
        }];
        $scope.type = {
            name: "En cours",
            id: "NOW"
        };

        $scope.delivery_mode = ["Comptoir", "Livraison"];

        $scope.open = function($event) {
            $event.preventDefault();
            $event.stopPropagation();

            $scope.opened = true;
        };

        $scope.$dict = {};

        var module;

        // Init
        $scope.$on('$viewContentLoaded', function() {
            // initialize core components
            Metronic.initAjax();

            // set default layout mode
            $rootScope.settings.layout.pageSidebarClosed = true;
            $rootScope.settings.layout.pageBodySolid = false;

            current = $rootScope.$state.current.name.split('.');
            console.log(current, $rootScope.$stateParams.id);

            module = current[0];

            switch (current[0]) {
                case 'offer':
                    Object = Orders.offer;
                    $scope.backTo = 'offersupplier.list';
                    break;
                case 'order':
                    Object = Orders.order;
                    $scope.backTo = 'ordersupplier.list';
                    break;
                case 'delivery':
                    Object = Orders.delivery;
                    $scope.backTo = 'deliverysupplier.list';
                    break;
                case 'bill':
                    Object = Orders.bill;
                    $scope.backTo = 'billsupplier.list';
                    break;
            }

            if ($rootScope.$stateParams.id && current.length <= 2 && current[1] === "show")
                return $rootScope.$state.go(current[0] + '.show.detail');


            var dict = ["fk_offer_status", "fk_paiement", "fk_input_reason", "fk_payment_term", "fk_tva"];
            $http({
                method: 'GET',
                url: '/erp/api/dict',
                params: {
                    dictName: dict
                }
            }).success(function(data, status) {
                $scope.dict = data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/bank',
                params: {
                    //entity: Global.user.entity
                }
            }).success(function(data, status) {
                $scope.banks = data;
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/bySalesAccount'
            }).success(function(data, status) {
                $scope.$dict.salesPerson = data.data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/getForDd',
                params: {
                    isEmployee: true
                }
            }).success(function(data, status) {
                $scope.$dict.employees = data.data;
                //console.log(data);
            });

            $scope.findOne();

        });

        $scope.module = function(themodule) {
            if (!themodule)
                return module;

            return module === themodule;
        };

        $scope.showStatus = function(idx, dict) {
            if (!($scope.dict[dict] && $scope.object[idx]))
                return;
            var selected = $filter('filter')($scope.dict[dict].values, {
                id: $scope.object[idx]
            });
            return ($scope.object[idx] && selected && selected.length) ? selected[0].label : 'Non défini';
        };

        $scope.create = function() {
            var object = new Object(this.object);
            object.$save(function(response) {
                $rootScope.$state.go(current[0] + '.show.detail', {
                    id: response._id
                });
            });
        };

        $scope.remove = function(object) {
            $scope.object.$remove();
            $rootScope.$state.go(current[0] + '.list');
        };

        $scope.clone = function() {
            $scope.object.$clone(function(response) {
                $rootScope.$state.go(current[0] + '.show.detail', {
                    id: response._id
                });
            });
        };

        $scope.update = function(callback) {
            var object = $scope.object;

            for (var i = object.lines.length; i--;) {
                // actually delete lines
                if (object.lines[i].isDeleted) {
                    object.lines.splice(i, 1);
                }
            }
            object.$update(function(response) {
                //$location.path('societe/' + societe._id);
                //pageTitle.setTitle('Commande client ' + object.ref);

                /*if (response.lines) {
                    for (var i = 0; i < response.lines.length; i++) {
                        $scope.object.lines[i].idLine = i;
                    }
                }
                if (response.Status == "DRAFT" || response.Status == "NEW" || response.Status == "QUOTES")
                    $scope.editable = true;
                else
                    $scope.editable = false;

                if (callback)
                    callback(null, response);*/

                $scope.findOne();
            });
        };

        $scope.findOne = function(callback) {
            if (!$rootScope.$stateParams.id) {
                $scope.editable = true;
                return;
            }

            Object.get({
                Id: $rootScope.$stateParams.id
            }, function(object) {
                $scope.object = object;
                console.log(object);
                //on utilise idLine pour definir la ligne produit que nous voulons supprimer
                for (var i = 0; i < $scope.object.lines.length; i++) {
                    $scope.object.lines[i].idLine = i;
                }
                if (object.Status == "DRAFT" || object.Status == "NEW" || object.Status == "QUOTES")
                    $scope.editable = true;
                else
                    $scope.editable = false;

                if (callback)
                    callback(object);
            }, function(err) {
                if (err.status === 401)
                    $location.path("401.html");
            });
        };

        $scope.sendEmail = function() {
            $http.post('/erp/api/sendEmail', {
                to: this.object.contacts,
                data: {
                    title: 'Votre devis ' + this.object.ref_client || "",
                    subtitle: this.object.client.name + (this.object.ref_client ? " - Reference " + this.object.ref_client : ""),
                    message: 'Veuillez trouver ci-joint la proposition commerciale. Cliquer sur le bouton ci-apres pour le telecharger.',
                    url: '/erp/api/object/download/' + this.object._id,
                    entity: this.object.entity
                },
                ModelEmail: 'email_PDF'
            }).then(function(res) {
                //console.log(res);
                if (res.status == 200) {

                    $scope.object.history.push({
                        date: new Date(),
                        mode: 'email',
                        msg: 'email envoye',
                        Status: 'notify',
                        author: {
                            id: $rootScope.login._id,
                            name: $rootScope.login.name
                        }
                    });

                    return $scope.update();
                }
                //return res.data;
            });
        };

        $scope.updateAddress = function(data) {
            console.log(data);

            $scope.object.address = data.address;

            if (data.salesPurchases.isGeneric)
                $scope.object.address.name = data.fullName;

            $scope.object.cond_reglement_code = data.salesPurchases.cond_reglement;
            $scope.object.mode_reglement_code = data.salesPurchases.mode_reglement;
            //$scope.object.priceList = data.salesPurchases.priceList;
            $scope.object.salesPerson = data.salesPurchases.salesPerson;
            $scope.object.salesTeam = data.salesPurchases.salesTeam;


            // Billing address
            $scope.object.billing = data.salesPurchases.cptBilling;

            $scope.object.shippingAddress = data.shippingAddress[0];

            $scope.object.addresses = data.shippingAddress;

            if (data.deliveryAddressId)
                for (var i = 0; i < data.shippingAddress.length; i++)
                    if (data.deliveryAddressId == data.shippingAddress[i]._id) {
                        $scope.object.shippingAddress = data.shippingAddress[i];
                        break;
                    }
        };

        $scope.createOrder = function() {
            // CLOSE ORDER
            var object = angular.copy($scope.object);

            var id = object._id;
            object.offer = object._id;
            delete object._id;
            delete object.Status;
            delete object.latex;
            delete object.datec;
            delete object.datel;
            delete object.createdAt;
            delete object.updatedAt;
            delete object.ref;
            delete object.history;

            var order = new Orders.order(object);

            //create new order
            order.$save(function(response) {
                $scope.object.Status = 'SIGNED';
                $scope.object.orders.push(response._id);
                $scope.object.$update(function(object) {
                    $rootScope.$state.go("order.show", { id: response._id });
                });
            });
        };

        $scope.createBill = function() {
            var object = angular.copy($scope.object);

            var id = object._id;
            object.orders = [object._id];
            delete object._id;
            delete object.Status;
            delete object.latex;
            delete object.datec;
            delete object.datel;
            delete object.createdAt;
            delete object.updatedAt;
            delete object.ref;
            delete object.history;

            var order = new Orders.bill(object);

            //create new bill
            order.$save(function(response) {
                $scope.object.Status = 'BILLED';
                $scope.object.$update(function(object) {
                    $rootScope.$state.go("bill.show", { id: response._id });
                });
            });
        };

        $scope.changeStatus = function(Status) {
            $scope.object.Status = Status;
            $scope.update();
        };

        $scope.createDelivery = function() {
            var modalInstance = $modal.open({
                templateUrl: '/templates/delivery/modal/create.html',
                controller: "DeliveryCreateController",
                resolve: {
                    object: function() {
                        return {
                            order: $scope.object,
                            priceList: $scope.object.supplier.salesPurchases.priceList
                        };
                    }
                }
            });

            modalInstance.result.then(function(delivery) {
                //scope.contacts.push(contacts);
                $scope.findOne(function(order) {
                    var partial = false;

                    for (var i = 0; i < order.deliveries.length; i++) {
                        //Refresh order quantities already sended

                        if (order.deliveries[i].deliveryQty < order.deliveries[i].orderQty) {
                            partial = true;
                            break;
                        }
                    }

                    if (partial == false) // CLOSE ORDER
                        order.Status = "CLOSED";
                    else // LEAVE IT OPENED
                        order.Status = "SHIPPING";

                    order.$update(function(response) {
                        $rootScope.$state.go('delivery.show.detail', {
                            id: delivery._id
                        });
                    });
                }, function() {});
            });
        };
    }
]);

MetronicApp.controller('OfferSupplierListController', ['$scope', '$rootScope', '$location', '$http', '$modal', '$filter', '$timeout',
    function($scope, $rootScope, $location, $http, $modal, $filter, $timeout) {

        var grid = new Datatable();
        var user = $rootScope.login;

        $scope.dict = {};

        $scope.types = [{
            name: "En cours",
            id: "NOW"
        }, {
            name: "Clos",
            id: "CLOSED"
        }];
        $scope.type = {
            name: "En cours",
            id: "NOW"
        };

        $scope.delivery_mode = ["Comptoir", "Livraison"];

        $scope.open = function($event) {
            $event.preventDefault();
            $event.stopPropagation();

            $scope.opened = true;
        };

        $scope.$dict = {};

        // Init
        $scope.$on('$viewContentLoaded', function() {
            // initialize core components
            Metronic.initAjax();

            // set default layout mode
            $rootScope.settings.layout.pageSidebarClosed = true;
            $rootScope.settings.layout.pageBodySolid = false;

            var dict = ["fk_offer_status", "fk_paiement", "fk_input_reason", "fk_payment_term", "fk_tva"];
            $http({
                method: 'GET',
                url: '/erp/api/dict',
                params: {
                    dictName: dict
                }
            }).success(function(data, status) {
                $scope.dict = data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/bySalesAccount'
            }).success(function(data, status) {
                $scope.$dict.salesPerson = data.data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/getForDd',
                params: {
                    isEmployee: true
                }
            }).success(function(data, status) {
                $scope.$dict.employees = data.data;
                //console.log(data);
            });

            initDatatable();
        });

        $scope.showStatus = function(idx, dict) {
            if (!($scope.dict[dict] && $scope.offer[idx]))
                return;
            var selected = $filter('filter')($scope.dict[dict].values, {
                id: $scope.offer[idx]
            });
            return ($scope.offer[idx] && selected && selected.length) ? selected[0].label : 'Non défini';
        };

        function initDatatable() {

            grid.init({
                src: $("#offerList"),
                onSuccess: function(grid) {
                    // execute some code after table records loaded
                },
                onError: function(grid) {
                    // execute some code on network or other general error 
                },
                loadingMessage: 'Loading...',
                dataTable: { // here you can define a typical datatable settings from http://datatables.net/usage/options 

                    // Uncomment below line("dom" parameter) to fix the dropdown overflow issue in the datatable cells. The default datatable layout
                    // setup uses scrollable div(table-scrollable) with overflow:auto to enable vertical scroll(see: assets/global/scripts/datatable.js). 
                    // So when dropdowns used the scrollable div should be removed. 
                    //"dom": "<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'<'table-group-actions pull-right'>>r>t<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'>>",

                    "bStateSave": true, // save datatable state(pagination, sort, etc) in cookie.

                    "ajax": {
                        "url": "/erp/api/offer/dt" // ajax source
                    },
                    "order": [
                        [1, "desc"]
                    ], // set first column as a default sort by asc
                    "columns": [{
                        data: 'bool'
                    }, {
                        "data": "ref"
                    }, {
                        "data": "supplier",
                        defaultContent: ""
                    }, {
                        "data": "ref_client",
                        defaultContent: ""
                    }, {
                        "data": "date_livraison",
                        defaultContent: ""
                    }, {
                        "data": "total_ht",
                        defaultContent: ""
                    }, {
                        "data": "Status"
                    }, {
                        "data": "entity",
                        defaultContent: ""
                    }, {
                        "data": "datec",
                        defaultContent: ""
                    }, {
                        data: 'action'
                    }]
                }
            });

            // handle group actionsubmit button click
            grid.getTableWrapper().on('click', '.table-group-action-submit', function(e) {
                e.preventDefault();
                var action = $(".table-group-action-input", grid.getTableWrapper());
                if (action.val() != "" && grid.getSelectedRowsCount() > 0) {
                    grid.setAjaxParam("customActionType", "group_action");
                    grid.setAjaxParam("customActionName", action.val());
                    grid.setAjaxParam("id", grid.getSelectedRows());
                    grid.getDataTable().ajax.reload();
                    grid.clearAjaxParams();
                } else if (action.val() == "") {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'Please select an action',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                } else if (grid.getSelectedRowsCount() === 0) {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'No record selected',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                }
            });
        }

        $scope.find = function() {
            grid.resetFilter();
        };
    }
]);

MetronicApp.controller('OrderSupplierListController', ['$scope', '$rootScope', '$location', '$http', '$modal', '$filter', '$timeout',
    function($scope, $rootScope, $location, $http, $modal, $filter, $timeout) {

        var grid = new Datatable();
        var user = $rootScope.login;

        $scope.dict = {};
        $scope.types = [{
            name: "En cours",
            id: "NOW"
        }, {
            name: "Clos",
            id: "CLOSED"
        }];
        $scope.type = {
            name: "En cours",
            id: "NOW"
        };

        $scope.delivery_mode = ["Comptoir", "Livraison"];

        $scope.open = function($event) {
            $event.preventDefault();
            $event.stopPropagation();

            $scope.opened = true;
        };

        $scope.$dict = {};

        // Init
        $scope.$on('$viewContentLoaded', function() {
            // initialize core components
            Metronic.initAjax();

            // set default layout mode
            $rootScope.settings.layout.pageSidebarClosed = true;
            $rootScope.settings.layout.pageBodySolid = false;

            var dict = ["fk_order_status", "fk_paiement", "fk_input_reason", "fk_payment_term", "fk_tva"];
            $http({
                method: 'GET',
                url: '/erp/api/dict',
                params: {
                    dictName: dict
                }
            }).success(function(data, status) {
                $scope.dict = data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/bySalesAccount'
            }).success(function(data, status) {
                $scope.$dict.salesPerson = data.data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/getForDd',
                params: {
                    isEmployee: true
                }
            }).success(function(data, status) {
                $scope.$dict.employees = data.data;
                //console.log(data);
            });

            initDatatable();
        });

        $scope.showStatus = function(idx, dict) {
            if (!($scope.dict[dict] && $scope.order[idx]))
                return;
            var selected = $filter('filter')($scope.dict[dict].values, {
                id: $scope.order[idx]
            });
            return ($scope.order[idx] && selected && selected.length) ? selected[0].label : 'Non défini';
        };

        function initDatatable() {

            grid.init({
                src: $("#orderList"),
                onSuccess: function(grid) {
                    // execute some code after table records loaded
                },
                onError: function(grid) {
                    // execute some code on network or other general error 
                },
                loadingMessage: 'Loading...',
                dataTable: { // here you can define a typical datatable settings from http://datatables.net/usage/options 

                    // Uncomment below line("dom" parameter) to fix the dropdown overflow issue in the datatable cells. The default datatable layout
                    // setup uses scrollable div(table-scrollable) with overflow:auto to enable vertical scroll(see: assets/global/scripts/datatable.js). 
                    // So when dropdowns used the scrollable div should be removed. 
                    //"dom": "<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'<'table-group-actions pull-right'>>r>t<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'>>",

                    "bStateSave": true, // save datatable state(pagination, sort, etc) in cookie.

                    "ajax": {
                        "url": "/erp/api/order/dt" // ajax source
                    },
                    "order": [
                        [1, "desc"]
                    ], // set first column as a default sort by asc
                    "columns": [{
                        data: 'bool'
                    }, {
                        "data": "ref"
                    }, {
                        "data": "supplier",
                        defaultContent: ""
                    }, {
                        "data": "ref_client",
                        defaultContent: ""
                    }, {
                        "data": "date_livraison",
                        defaultContent: ""
                    }, {
                        "data": "total_ht",
                        defaultContent: ""
                    }, {
                        "data": "Status"
                    }, {
                        "data": "entity",
                        defaultContent: ""
                    }, {
                        "data": "datec",
                        defaultContent: ""
                    }, {
                        data: 'action'
                    }]
                }
            });

            // handle group actionsubmit button click
            grid.getTableWrapper().on('click', '.table-group-action-submit', function(e) {
                e.preventDefault();
                var action = $(".table-group-action-input", grid.getTableWrapper());
                if (action.val() != "" && grid.getSelectedRowsCount() > 0) {
                    grid.setAjaxParam("customActionType", "group_action");
                    grid.setAjaxParam("customActionName", action.val());
                    grid.setAjaxParam("id", grid.getSelectedRows());
                    grid.getDataTable().ajax.reload();
                    grid.clearAjaxParams();
                } else if (action.val() == "") {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'Please select an action',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                } else if (grid.getSelectedRowsCount() === 0) {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'No record selected',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                }
            });
        }

        $scope.find = function() {
            grid.resetFilter();
        };
    }
]);

MetronicApp.controller('DeliverySupplierListController', ['$scope', '$rootScope', '$location', '$http', '$modal', '$filter', '$timeout',
    function($scope, $rootScope, $location, $http, $modal, $filter, $timeout) {

        var grid = new Datatable();
        var user = $rootScope.login;

        $scope.dict = {};

        $scope.types = [{
            name: "En cours",
            id: "NOW"
        }, {
            name: "Clos",
            id: "CLOSED"
        }];
        $scope.type = {
            name: "En cours",
            id: "NOW"
        };

        $scope.delivery_mode = ["Comptoir", "Livraison"];

        $scope.open = function($event) {
            $event.preventDefault();
            $event.stopPropagation();

            $scope.opened = true;
        };

        $scope.$dict = {};

        // Init
        $scope.$on('$viewContentLoaded', function() {
            // initialize core components
            Metronic.initAjax();

            // set default layout mode
            $rootScope.settings.layout.pageSidebarClosed = true;
            $rootScope.settings.layout.pageBodySolid = false;

            var dict = ["fk_delivery_status", "fk_paiement", "fk_input_reason", "fk_payment_term", "fk_tva"];
            $http({
                method: 'GET',
                url: '/erp/api/dict',
                params: {
                    dictName: dict
                }
            }).success(function(data, status) {
                $scope.dict = data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/bySalesAccount'
            }).success(function(data, status) {
                $scope.$dict.salesPerson = data.data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/getForDd',
                params: {
                    isEmployee: true
                }
            }).success(function(data, status) {
                $scope.$dict.employees = data.data;
                //console.log(data);
            });

            initDatatable();
        });

        $scope.showStatus = function(idx, dict) {
            if (!($scope.dict[dict] && $scope.delivery[idx]))
                return;
            var selected = $filter('filter')($scope.dict[dict].values, {
                id: $scope.delivery[idx]
            });
            return ($scope.delivery[idx] && selected && selected.length) ? selected[0].label : 'Non défini';
        };

        function initDatatable() {

            grid.init({
                src: $("#deliveryList"),
                onSuccess: function(grid) {
                    // execute some code after table records loaded
                },
                onError: function(grid) {
                    // execute some code on network or other general error 
                },
                loadingMessage: 'Loading...',
                dataTable: { // here you can define a typical datatable settings from http://datatables.net/usage/options 

                    // Uncomment below line("dom" parameter) to fix the dropdown overflow issue in the datatable cells. The default datatable layout
                    // setup uses scrollable div(table-scrollable) with overflow:auto to enable vertical scroll(see: assets/global/scripts/datatable.js). 
                    // So when dropdowns used the scrollable div should be removed. 
                    //"dom": "<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'<'table-group-actions pull-right'>>r>t<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'>>",

                    "bStateSave": true, // save datatable state(pagination, sort, etc) in cookie.

                    "ajax": {
                        "url": "/erp/api/delivery/dt" // ajax source
                    },
                    "order": [
                        [1, "desc"]
                    ], // set first column as a default sort by asc
                    "columns": [{
                        data: 'bool'
                    }, {
                        "data": "ref"
                    }, {
                        "data": "supplier",
                        defaultContent: ""
                    }, {
                        "data": "ref_client",
                        defaultContent: ""
                    }, {
                        "data": "date_livraison",
                        defaultContent: ""
                    }, {
                        "data": "total_ht",
                        defaultContent: ""
                    }, {
                        "data": "Status"
                    }, {
                        "data": "entity",
                        defaultContent: ""
                    }, {
                        "data": "datec",
                        defaultContent: ""
                    }, {
                        data: 'action'
                    }]
                }
            });

            // handle group actionsubmit button click
            grid.getTableWrapper().on('click', '.table-group-action-submit', function(e) {
                e.preventDefault();
                var action = $(".table-group-action-input", grid.getTableWrapper());
                if (action.val() != "" && grid.getSelectedRowsCount() > 0) {
                    grid.setAjaxParam("customActionType", "group_action");
                    grid.setAjaxParam("customActionName", action.val());
                    grid.setAjaxParam("id", grid.getSelectedRows());
                    grid.getDataTable().ajax.reload();
                    grid.clearAjaxParams();
                } else if (action.val() == "") {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'Please select an action',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                } else if (grid.getSelectedRowsCount() === 0) {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'No record selected',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                }
            });
        }

        $scope.find = function() {
            grid.resetFilter();
        };
    }
]);

MetronicApp.controller('BillSupplierListController', ['$scope', '$rootScope', '$http', '$window', '$filter', '$timeout',
    function($scope, $rootScope, $http, $window, $filter, $timeout) {

        var grid = new Datatable();
        var user = $rootScope.login;

        $scope.editable = false;

        $scope.dict = {};
        $scope.status_id = "LIST";

        // Init
        $scope.$on('$viewContentLoaded', function() {
            // initialize core components
            Metronic.initAjax();

            // set default layout mode
            $rootScope.settings.layout.pageSidebarClosed = true;
            $rootScope.settings.layout.pageBodySolid = false;

            var dict = ["fk_bill_status", "fk_input_reason", "fk_paiement", "fk_bill_type", "fk_transport", "fk_payment_term", "fk_tva"];

            $http({
                method: 'GET',
                url: '/erp/api/dict',
                params: {
                    dictName: dict
                }
            }).success(function(data, status) {
                $scope.dict = data;
                //console.log(data);
            });

            initDatatable();

        });

        // Init ng-include
        $scope.$on('$includeContentLoaded', function() {
            // initialize core components
            Metronic.initAjax();

            // set default layout mode
            $rootScope.settings.layout.pageSidebarClosed = true;
            $rootScope.settings.layout.pageBodySolid = false;

            var dict = ["fk_bill_status", "fk_input_reason", "fk_paiement", "fk_bill_type", "fk_transport", "fk_payment_term", "fk_tva"];

            $http({
                method: 'GET',
                url: '/erp/api/dict',
                params: {
                    dictName: dict
                }
            }).success(function(data, status) {
                $scope.dict = data;
                //console.log(data);
            });

        });

        $scope.ngIncludeInit = function(params, length) {
            $scope.params = params;
            initDatatable(params, length);
        };

        $scope.open = function($event) {
            $event.preventDefault();
            $event.stopPropagation();

            $scope.opened = true;
        };

        $scope.openUrl = function(url, param) {
            if (!grid)
                return;

            var params = {};

            if (!params.entity)
                params.entity = $rootScope.entity;

            params.id = grid.getSelectedRows();

            //$window.open($rootScope.buildUrl(url, params), '_blank');
            $http({
                method: 'POST',
                url: url,
                data: params,
                responseType: 'arraybuffer'
            }).success(function(data, status, headers) {
                headers = headers();

                var filename = headers['x-filename'];
                var contentType = headers['content-type'];

                var linkElement = document.createElement('a');
                try {
                    var blob = new Blob([data], { type: contentType });
                    var url = window.URL.createObjectURL(blob);

                    linkElement.setAttribute('href', url);
                    linkElement.setAttribute("download", filename);

                    var clickEvent = new MouseEvent("click", {
                        "view": window,
                        "bubbles": true,
                        "cancelable": false
                    });
                    linkElement.dispatchEvent(clickEvent);
                } catch (ex) {
                    console.log(ex);
                }
            }).error(function(data) {
                console.log(data);
            });
        };

        function getUrl(params) {

            if (!params)
                params = {
                    status_id: $scope.status_id
                };

            if (!params.entity)
                params.entity = $rootScope.entity;

            var url = $rootScope.buildUrl('/erp/api/bill/dt', params); // Build URL with json parameter
            //console.log(url);
            return url;
        }

        function initDatatable(params, length) {

            grid.init({
                src: $("#billList"),
                onSuccess: function(grid) {
                    // execute some code after table records loaded
                },
                onError: function(grid) {
                    // execute some code on network or other general error 
                },
                loadingMessage: 'Loading...',
                dataTable: { // here you can define a typical datatable settings from http://datatables.net/usage/options 

                    // Uncomment below line("dom" parameter) to fix the dropdown overflow issue in the datatable cells. The default datatable layout
                    // setup uses scrollable div(table-scrollable) with overflow:auto to enable vertical scroll(see: assets/global/scripts/datatable.js). 
                    // So when dropdowns used the scrollable div should be removed. 
                    //"dom": "<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'<'table-group-actions pull-right'>>r>t<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'>>",

                    "bStateSave": (params ? false : true), // save datatable state(pagination, sort, etc) in cookie.
                    "pageLength": length || 25, // default record count per page
                    "ajax": {
                        "url": getUrl(params) // ajax source
                    },
                    "order": [
                        [1, "desc"]
                    ], // set first column as a default sort by asc
                    "columns": [{
                        data: 'bool'
                    }, {
                        data: "ref"
                    }, {
                        data: "supplier",
                        defaultContent: "",
                        visible: (params && params['client.id'] ? false : true)
                    }, {
                        data: "ref_client",
                        defaultContent: ""
                    }, {
                        data: "datec",
                        defaultContent: ""
                    }, {
                        data: "dater",
                        defaultContent: ""
                    }, {
                        data: "commercial_id.name",
                        defaultContent: ""
                    }, {
                        data: "total_ttc",
                        defaultContent: ""
                    }, {
                        data: "Status"
                    }, {
                        data: "entity",
                        defaultContent: "",
                        visible: user.multiEntities
                    }, {
                        data: "updatedAt",
                        defaultContent: ""
                    }, {
                        data: 'action'
                    }]
                }
            });

            // handle group actionsubmit button click
            grid.getTableWrapper().on('click', '.table-group-action-submit', function(e) {
                e.preventDefault();
                var action = $(".table-group-action-input", grid.getTableWrapper());
                if (action.val() != "" && grid.getSelectedRowsCount() > 0) {
                    grid.setAjaxParam("customActionType", "group_action");
                    grid.setAjaxParam("customActionName", action.val());
                    grid.setAjaxParam("id", grid.getSelectedRows());
                    grid.getDataTable().ajax.reload();
                    grid.clearAjaxParams();
                } else if (action.val() == "") {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'Please select an action',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                } else if (grid.getSelectedRowsCount() === 0) {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'No record selected',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                }
            });
        }

        $scope.find = function() {
            var url;
            //console.log(this.status_id);

            if ($scope.params) { // For ng-include in societe fiche
                $scope.params.status_id = this.status_id;
                url = getUrl($scope.params);
            } else
                url = getUrl({ status_id: this.status_id });

            grid.resetFilter(url);
        };


        $scope.exportAccounting = function(id) {
            if (!id && grid) {
                return $http({
                    method: 'PUT',
                    url: '/erp/api/bill/accounting',
                    data: {
                        id: grid.getSelectedRows()
                    }
                }).success(function(data, status) {
                    if (status === 200)
                        $scope.find();
                });
            }
            return $http({
                method: 'PUT',
                url: '/erp/api/bill/accounting',
                data: {
                    id: id //grid.getSelectedRows()
                }
            }).success(function(data, status) {
                if (status === 200 && id)
                    $scope.findOne();
                else
                    $scope.find();
            });
        };

        $scope.filterOptionsPayment = {
            filterText: "",
            useExternalFilter: false
        };

    }
]);

MetronicApp.controller('DeliverySupplierCreateController', ['$scope', '$rootScope', '$http', '$modalInstance', 'Orders', 'object', function($scope, $rootScope, $http, $modalInstance, Orders, object) {

    $scope.order = object.order;

    for (var i = 0; i < $scope.order.deliveries.length; i++)
        $scope.order.deliveries[i].qty_dl = $scope.order.deliveries[i].orderQty - $scope.order.deliveries[i].deliveryQty;

    $scope.sum = function() {
        $scope.total = 0;
        $scope.weight = 0;
        for (var i = 0; i < $scope.order.deliveries.length; i++) {
            $scope.total += $scope.order.deliveries[i].qty_dl;
            $scope.weight += $scope.order.deliveries[i].qty_dl * $scope.order.deliveries[i].product.weight;
        }
    };

    function calculHT(line) {
        if (line.qty) {
            line.total_ht = round(line.qty * (line.pu_ht * (1 - (line.discount / 100))), 2);
            //line.total_tva = line.total_ht * line.tva_tx / 100;
        } else {
            line.total_ht = 0;
            //line.total_tva = 0;
        }
    }

    $scope.createDelivery = function() {
        var delivery = new Orders.delivery(object.order);

        delivery.order = delivery._id;
        delete delivery._id;
        delete delivery.Status;
        delete delivery.latex;
        delete delivery.datec;
        delete delivery.history;
        //delete delivery.datel;
        delete delivery.createdAt;
        delete delivery.updatedAt;
        delete delivery.ref;

        delivery.createdBy = $rootScope.login._id;
        delivery.editedBy = $rootScope.login._id;
        //delete delivery.notes;

        delivery.contacts = _.pluck(delivery.contacts, '_id');

        //console.log(delivery.bl);

        //Copy first address BL

        delivery.lines = [];
        var cpt = 0;

        function save(line) {
            cpt--;

            calculHT(line);
            delivery.lines.push(line);

            if (cpt > 0)
                return;

            console.log(delivery);

            delivery.$save(function(response) {
                //console.log(response);
                $modalInstance.close(response);
            });
        };

        function addLine(deliveryLine) {
            var line = {
                type: 'product', //Used for subtotal
                qty: deliveryLine.qty_dl,
                pu_ht: 0,
                product: deliveryLine.product,
                total_taxes: [],
                discount: 0
            };

            if (line.qty && line.product && line.product._id && !line.priceSpecific)
                $http.post('/erp/api/product/price', {
                    priceList: object.priceList._id,
                    qty: line.qty,
                    _id: line.product._id
                }).then(function(res) {
                    console.log(res.data);
                    line.pu_ht = res.data.pu_ht;
                    if (res.data.discount)
                        line.discount = res.data.discount;

                    //return res.data;

                    save(line);
                });
            else
                save(line);
        }

        for (var j = 0; j < delivery.deliveries.length; j++) {
            if (delivery.deliveries[j].qty_dl == 0)
                continue;

            cpt++;

            addLine(delivery.deliveries[j]);


            //console.log(line, object);
        }
        return;
    };

    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };


}]);