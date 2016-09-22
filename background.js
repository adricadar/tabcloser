(function() {
    var intervalCheck = 60000;
    var ONE_MINUTE = 60 * 1000;
    var tabLifetime = 60 * 24; // 1 day

    chrome.storage.local.get(['minutes', 'hours', 'days', 'intervalCheck'], (res) => {
        tabLifetime = Number.parseInt(res.minutes) +  Number.parseInt(res.hours) * 60 +  Number.parseInt(res.days) * 60 * 24;
        intervalCheck = res.intervalCheck * ONE_MINUTE;
    });

    function contains(tabsMetadata, tabId) {
        var found = false;
        for(var i = 0; i < tabsMetadata.length; i++) {
            if (tabsMetadata[i].id == tabId) {
                found = true;
                break;
            }
        }
        return found;
    };

    function indexOf(tabsMeta, tabId) {
        for (var i = 0; i < tabsMeta.length; i++) {
            if (tabsMeta[i].id === tabId) { 
                return i;
            }
        }
        return -1;
    }

    function TabMetadata(id, startDate) {
        var self = this;

        self.id = id;
        self.startDate = startDate;

        return this;
    };

    function TabStorage() {
        var self = this;

        var tabsMetadata = "tabsMetadata";

        self.get = function(onCall) {
            chrome.storage.local.get(tabsMetadata, function (tabs) {
                var tabsMeta = tabs[tabsMetadata] || [];

                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError);
                } else {
                   onCall(tabsMeta);
                }
            });
        };

        self.set = function(newTab) {
            self.get(function(tabsMeta) {
                 tabsMeta.push(newTab);
                 chrome.storage.local.set({ tabsMetadata: tabsMeta }, onSet);
            });
        };

        self.setAll = function(tabsMeta) {
            chrome.storage.local.set({ tabsMetadata: tabsMeta }, onSet);
        };

        self.remove = function(tabId) {
            self.get(function(tabsMeta) {
                var index = indexOf(tabsMeta, tabId);
                if(index >= 0) {
                     tabsMeta.splice(index, 1);
                }
                self.setAll(tabsMeta);
            });
        };

        self.removeAll = function(tabIds) {
            self.get(function(tabsMeta) {
                for(var tabId of tabIds) {
                    var index = indexOf(tabsMeta, tabId);
                    if(index >= 0) {
                        tabsMeta.splice(index, 1);
                    }
                }
                self.setAll(tabsMeta);
            });
        };

        self.updateAll = function(tabIds) {
            self.get(function (tabsMeta) {
                for(var tabId of tabIds) {
                    var index = indexOf(tabsMeta, tabId);
                    if(index >= 0) {
                        var oldDate = tabsMeta[index].startDate;

                        self.remove(tabId);
                        tabsMeta[index].startDate = Date.now();
                        self.set(tabsMeta[index]);
                        
                        console.log("updated: " + tabId + " - " + oldDate + " - " + tabsMeta[index].startDate);
                    }
                }
            });
        };

        function onSet() {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError);
            } else {
                console.log("tab added");
            }
        };

        return self;
    }

    var tabStorage = new TabStorage();

    function updateTab(tabId) {
         tabStorage.updateAll([tabId]);
    }

    browser.tabs.onUpdated.addListener(updateTab);

    browser.tabs.onCreated.addListener(function(tab) {
        if(browser.tabs.TAB_ID_NONE != tab.id) {
            var newTab = new TabMetadata(tab.id, Date.now());
            //chrome.storage.local.clear();
            tabStorage.set(newTab);
        }  
    });

    browser.tabs.onRemoved.addListener(function(tabId) {
        tabStorage.remove(tabId);
    });

    function removeTabs(tabsMetadata) {
        console.log(tabsMetadata);
        var oldTabMetas = tabsMetadata.filter(function(tabMetadata){
            var difference = Date.now() - tabMetadata.startDate;
            return Math.round(difference / ONE_MINUTE) > tabLifetime; 
        });

        browser.tabs.query({ pinned: false }, function(tabs) {
            var oldTabs = tabs.filter(function (tab) {
               return contains(oldTabMetas, tab.id);
            });

            var oldTabIds = oldTabs.map(function(tab) {
                return tab.id;
            });
            
            console.log(oldTabIds);
            browser.tabs.remove(oldTabIds);
        });
    };

    function updateTabs() {
        browser.tabs.query({ active: true }, function(tabs) {
            var tabIds = tabs.map(function(tab) {
                return tab.id;
            });
            
           tabStorage.updateAll(tabIds);
        });

        browser.tabs.query({ pinned: true }, function(tabs) {
            var tabIds = tabs.map(function(tab) {
                return tab.id;
            });
            
           tabStorage.updateAll(tabIds);
        });
    };

    setInterval(function(){
        console.log("hello background");
        console.log("tabLifetime: " + tabLifetime + " minutes");

        updateTabs();
        tabStorage.get(removeTabs);

    }, intervalCheck);
        
    function handleClick() {
        chrome.runtime.openOptionsPage();
    }

    chrome.browserAction.onClicked.addListener(handleClick);
})();