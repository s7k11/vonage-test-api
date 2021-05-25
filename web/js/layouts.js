const LayoutBase = function (container, items, type) {
  this.items = items;
  this.container = container;
  container.data('currentLayoutType', type);
};

LayoutBase.prototype = {
  rearrange() {
    const { features } = this;
    Object.keys(this.items).forEach(function (id) {
      const { style } = this.items[id];
      Object.keys(features).forEach((feature) => {
        style[feature] = features[feature];
      });
    }, this);
    Utils.sendEvent('hangout:rearranged');
    return this;
  },

  get features() {
    return {};
  },

  get total() {
    return Object.keys(this.items).length;
  },

  destroy() {
    this.container = null;
  },
};

const Grid = function (container, items) {
  LayoutBase.call(this, container, items, 'grid');
};

Grid.prototype = Object.create(LayoutBase.prototype, {
  features: {
    configurable: false,
    get() {
      const { total } = this;
      const columns = Math.ceil(Math.sqrt(total));

      return {
        width: `${100 / columns}%`,
        height: `${100 / Math.ceil(total / columns)}%`,
      };
    },
  },
});

Grid.prototype.constructor = Grid;

const Float = function (container, items) {
  LayoutBase.call(this, container, items, 'float');
  this.addDraggableFeature();
};

Float.prototype = Object.create(LayoutBase.prototype, {
  features: {
    configurable: false,
    get() {
      return {
        width: '100%',
        height: '100%',
      };
    },
  },

  publisher: {
    configurable: false,
    get() {
      return this.items.publisher;
    },
  },
});

Float.prototype.constructor = Float;

Float.prototype.addDraggableFeature = function () {
  if (this.addedDraggableFeature || !this.publisher) {
    return;
  }

  this.addedDraggableFeature = true;
  Utils.getDraggable().then((draggable) => {
    draggable.on(this.publisher);
  });
};

Float.prototype.rearrange = function (...args) {
  LayoutBase.prototype.rearrange.apply(this, args);
  this.addDraggableFeature();
};

Float.prototype.destroy = function () {
  Utils.getDraggable().then(function (draggable) {
    draggable.off(this.publisher);
    LayoutBase.prototype.destroy.apply(this, arguments);
  }.bind(this));
};

const F2FHorizontal = function (container, items) {
  LayoutBase.call(this, container, items, 'f2f_horizontal');
};

F2FHorizontal.prototype = Object.create(LayoutBase.prototype, {
  features: {
    configurable: false,
    get() {
      return {
        width: '100%',
        height: `${100 / this.total}%`,
      };
    },
  },
});

F2FHorizontal.prototype.constructor = F2FHorizontal;

const F2FVertical = function (container, items) {
  LayoutBase.call(this, container, items, 'f2f_vertical');
};

F2FVertical.prototype = Object.create(LayoutBase.prototype, {
  features: {
    configurable: false,
    get() {
      return {
        width: `${100 / this.total}%`,
        height: '100%',
      };
    },
  },
});

F2FVertical.prototype.constructor = F2FVertical;

const Hangout = function (container, items, item, type) {
  LayoutBase.call(this, container, items, type);
  Object.keys(this.handlers).forEach(function (type) {
    window.addEventListener(type, this);
  }, this);

  this.sanitize(!!item);

  if (item) {
    this.putItemOnStage(item);
  } else if (!this.totalOnStage) {
    this.putItemOnStage(this.getRandomItem());
  }

  this.updateTotalOnStage();
};

/*
 * It returns the data attribute where the id will be stored depending on type
 *
 * @param type - camera or screen
 */
Hangout.getAttributeName = (type) => `onStage${type.charAt(0).toUpperCase()}${type.slice(1)}`;

/*
 * It returns the type of item which is used to index internally
 *
 * @param item - item object
 */
Hangout.getItemType = (item) => {
  let type = null;

  switch (item.data('streamType')) {
    case 'camera':
    case 'publisher':
      type = 'camera';
      break;

    default:
      type = 'screen';
  }

  return type;
};

/*
 * It returns the id of item received as param
 *
 * @param item - item object
 */
Hangout.getItemId = (item) => item.data('id');

/*
 * It returns an array of objects for each event with type and attribute name
 */
Hangout.stageTypeDescriptors = ['camera', 'screen'].map((aType) => ({
  type: aType,
  attrName: Hangout.getAttributeName(aType),
}));

Hangout.prototype = Object.create(LayoutBase.prototype, {
  stageIds: {
    configurable: false,
    /*
     * It returns all ids of items on stage
     */
    get() {
      const ids = {};

      Hangout.stageTypeDescriptors.forEach(function (descriptor) {
        const id = this.container.data(descriptor.attrName);
        id && (ids[descriptor.type] = id);
      }, this);

      return ids;
    },
    /*
     * Store all ids of items on stage
     */
    set(aIds) {
      aIds = aIds || {};

      Hangout.stageTypeDescriptors.forEach(function (descriptor) {
        if (aIds[descriptor.type]) {
          this.container.data(descriptor.attrName, aIds[descriptor.type]);
        } else {
          this.container.data(descriptor.attrName, null);
        }
      }, this);
    },
  },
  totalOnStage: {
    configurable: false,
    /*
     * It returns the total number of items rendered on the stage
     */
    get() {
      return Object.keys(this.stageIds).length;
    },
  },
  totalOnStrip: {
    configurable: false,
    /*
     * It returns the total number of items rendered on the strip
     */
    get() {
      return this.total - this.totalOnStage;
    },
  },
});

Hangout.prototype.constructor = Hangout;

Hangout.prototype.handlers = {
  'layoutView:itemSelected': function (evt) {
    const { item } = evt.detail;
    if (this.isOnStage(item)) {
      // Selected item is already on stage so it should be expanded to cover all. That means that
      // the other item on stage should go to the strip leaving the stage
      this.removeCurrentItemFromStage(
        Hangout.getItemType(item) === 'camera' ? 'screen' : 'camera',
      );
    } else {
      this.putItemOnStage(item);
    }
    this.updateTotalOnStage();
  },
  'layoutManager:itemDeleted': function (evt) {
    const { item } = evt.detail;
    if (this.isOnStage(item)) {
      this.removeItemFromStage(item).updateTotalOnStage();
      !this.totalOnStage && Utils.sendEvent('hangout:emptyStage');
    }
  },
  'layoutManager:itemAdded': function (evt) {
    const { item } = evt.detail;
    // New screen shared goes to stage if there is not another screen shared there
    if (Hangout.getItemType(item) === 'screen' && !this.stageIds.screen) {
      this.putItemOnStage(item).updateTotalOnStage();
    }
  },
};

Hangout.prototype.handleEvent = function (evt) {
  this.handlers[evt.type].call(this, evt);
};

/*
 * It puts an item on stage:
 *
 * 1º) Remove the current item on stage of the same type if it exists and then...
 * 2º) Put the item received as param on the stage
 *
 * @param item - item object
 */
Hangout.prototype.putItemOnStage = function (item) {
  if (!item) {
    return this;
  }
  const type = Hangout.getItemType(item);
  this.removeCurrentItemFromStage(type).putStageId(item);
  item.classList.add('on-stage');
  type === 'screen' && Utils.sendEvent('hangout:screenOnStage', { status: 'on' });
  return this;
};

/*
 * It returns a random item (publisher stream is not included)
 */
Hangout.prototype.getRandomItem = function () {
  return this.items[Object.keys(this.items).find((id) => id !== 'publisher')];
};

/*
 * It removes the current item on stage given a type if this exists
 *
 * @param type - type of item
 */
Hangout.prototype.removeCurrentItemFromStage = function (type) {
  const item = this.items[this.stageIds[type]];
  return this.removeItemFromStage(item);
};

/*
 * It removes the current item on stage given a type if this exists
 *
 * @param item - item object
 */
Hangout.prototype.removeItemFromStage = function (item) {
  if (item) {
    this.removeStageId(item);
    item.classList.remove('on-stage');
    Hangout.getItemType(item) === 'screen'
      && Utils.sendEvent('hangout:screenOnStage', { status: 'off' });
  }
  return this;
};

/*
 * It returns true if the item is already on stage
 *
 * @param item - item object
 */
Hangout.prototype.isOnStage = (item) => item.classList.contains('on-stage');

/*
 * This method checks the latest status of the stage in order to be synchronized with current
 * items available in the layout.
 *
 * * @param reset - all previous status will be deleted if this flag is true
 */
Hangout.prototype.sanitize = function (reset) {
  const sanitizedStageIds = {};
  Array.prototype.forEach.call(this.container.querySelectorAll('.on-stage'), (elem) => {
    elem.classList.remove('on-stage');
  });

  if (!reset) {
    // Checking items previously on stage if they still exist
    const { stageIds } = this;
    Object.keys(stageIds).forEach(function (type) {
      const id = stageIds[type];
      const item = this.items[id];
      if (item) {
        item.classList.add('on-stage');
        sanitizedStageIds[type] = id;
      }
    }, this);
  }

  this.stageIds = sanitizedStageIds;
  return this;
};

/*
 * It saves an item id on stage
 *
 * @param item - item object
 */
Hangout.prototype.putStageId = function (item) {
  const ids = this.stageIds;
  ids[Hangout.getItemType(item)] = Hangout.getItemId(item);
  this.stageIds = ids;
  return this;
};

/*
 * It removes an item id on stage
 *
 * @param item - item object
 */
Hangout.prototype.removeStageId = function (item) {
  const ids = this.stageIds;
  delete ids[Hangout.getItemType(item)];
  this.stageIds = ids;
  return this;
};

/*
 * It updates the flag that contains the total number of items on stage in order to update the UI
 */
Hangout.prototype.updateTotalOnStage = function () {
  this.container.data('totalOnStage', this.totalOnStage);
  return this.rearrange();
};

Hangout.prototype.destroy = function (...args) {
  Object.keys(this.handlers).forEach(function (name) {
    window.removeEventListener(name, this);
  }, this);
  LayoutBase.prototype.destroy.apply(this, args);
};

const HangoutHorizontal = function (container, items, streamSelectedId) {
  Hangout.call(this, container, items, streamSelectedId, 'hangout_horizontal');
};

HangoutHorizontal.prototype = Object.create(Hangout.prototype, {
  features: {
    configurable: false,
    get() {
      return {
        width: `${100 / this.totalOnStrip}%`,
        height: '100%',
      };
    },
  },
});

HangoutHorizontal.prototype.constructor = HangoutHorizontal;

const HangoutVertical = function (container, items, streamSelectedId) {
  Hangout.call(this, container, items, streamSelectedId, 'hangout_vertical');
};

HangoutVertical.prototype = Object.create(Hangout.prototype, {
  features: {
    configurable: false,
    get() {
      return {
        width: '100%',
        height: `${100 / this.totalOnStrip}%`,
      };
    },
  },
});

HangoutVertical.prototype.constructor = HangoutVertical;
