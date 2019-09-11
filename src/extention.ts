
const isFunction = (obj: any) => typeof obj === "function";
const isObject = (obj: any) => typeof obj === "object";
const some =  (collection: any[], matcher: any) => {
    return collection.some(matcher);
};
const WILDCARD = "*";


export default class NowJsModdleExtension {

    public static $inject = ["eventBus"];
    constructor(eventBus: any) {
        const self = this;

        eventBus.on("moddleCopy.canCopyProperty", (context: any) => {
            // tslint:disable-next-line:one-variable-per-declaration
            const property = context.property,
                  parent = context.parent;

            return self.canCopyProperty(property, parent);
        });
    }

    public canCopyProperty(property: any, parent: any) {
        const self = this;
        // (1) check wether property is allowed in parent
        if (isObject(property) && !self.isAllowedInParent(property, parent)) {

          return false;
        }

        // (2) check more complex scenarios

        if (self.is(property, "nowjs:InputOutput") && !this.canHostInputOutput(parent)) {
          return false;
        }

        if (self.isAny(property, [ "nowjs:Connector", "nowjs:Field" ]) && !this.canHostConnector(parent)) {
          return false;
        }

      }

      public canHostInputOutput(parent: any) {
        const self = this;
        // allowed in nowjs:Connector
        const connector = self.getParent(parent, "nowjs:Connector");

        if (connector) {
            return true;
        }

        // special rules inside bpmn:FlowNode
        const flowNode = self.getParent(parent, "bpmn:FlowNode");

        if (!flowNode) {
            return false;
        }

        if (self.isAny(flowNode, ["bpmn:StartEvent", "bpmn:Gateway", "bpmn:BoundaryEvent"])) {
            return false;
        }

        if (self.is(flowNode, "bpmn:SubProcess") && flowNode.get("triggeredByEvent")) {
            return false;
        }

        return true;
    }

    public canHostConnector(parent: any) {
        const self = this;
        const serviceTaskLike = self.getParent(parent, "nowjs:ServiceTaskLike");

        if (self.is(serviceTaskLike, "bpmn:MessageEventDefinition")) {

            // only allow on throw and end events
            return (
                self.getParent(parent, "bpmn:IntermediateThrowEvent") ||
                self.getParent(parent, "bpmn:EndEvent")
            );
        }

        return true;
    }


    private  is(element: any, type: any) {
        return element && isFunction(element.$instanceOf) && element.$instanceOf(type);
    }

    private  isAny(element: any, types: any) {
        const self = this;
        return some(types, (t: any) => {
            return self.is(element, t);
        });
    }

    private  getParent(element: any, type: any): any {
        const self = this;
        if (!type) {
            return element.$parent;
        }

        if (self.is(element, type)) {
            return element;
        }

        if (!element.$parent) {
            return;
        }

        return self.getParent(element.$parent, type);
    }

    private isAllowedInParent(property: any, parent: any) {
        const self = this;
        // (1) find property descriptor
        const descriptor = property.$type && property.$model.getTypeDescriptor(property.$type);
        const allowedIn = descriptor && descriptor.meta && descriptor.meta.allowedIn;
        if (!allowedIn || self.isWildcard(allowedIn)) {
            return true;
        }
        // (2) check wether property has parent of allowed type
        return some(allowedIn, (type: any) => {
            return self.getParent(parent, type);
        });
    }

    private isWildcard(allowedIn: string) {
        return allowedIn.indexOf(WILDCARD) !== -1;
    }

}
