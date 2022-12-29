import { useNode, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import React, { useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import {
  DeleteOutlined,
  ArrowUpOutlined,
  DragOutlined,
} from "@ant-design/icons";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const IndicatorDiv = styled.div`
  height: 30px;
  margin-top: -29px;
  font-size: 12px;
  line-height: 12px;

  svg {
    fill: #fff;
    width: 15px;
    height: 15px;
  }
`;

const Btn = styled.a`
  padding: 0 0px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  > div {
    position: relative;
    top: -50%;
    left: -50%;
  }
`;

export const RenderNode = ({ render }) => {
  const { id } = useNode();
  const { actions, query, isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  const {
    isHover,
    dom,
    name,
    moveable,
    deletable,
    connectors: { drag },
    parent,
  } = useNode((node) => ({
    isHover: node.events.hovered,
    dom: node.dom,
    name: node.data.custom.displayName || node.data.displayName,
    moveable: query.node(node.id).isDraggable(),
    deletable: query.node(node.id).isDeletable(),
    parent: node.data.parent,
    props: node.data.props,
  }));

  const currentRef = useRef<HTMLDivElement>();

  useEffect(() => {
    if (dom) {
      if (isActive || isHover) dom.classList.add("component-selected");
      else dom.classList.remove("component-selected");
    }
  }, [dom, isActive, isHover]);

  const getPos = useCallback((dom: HTMLElement) => {
    const { top, left, bottom } = dom
      ? dom.getBoundingClientRect()
      : { top: 0, left: 0, bottom: 0 };
    return {
      top: `${top > 0 ? top : bottom}px`,
      left: `${left}px`,
    };
  }, []);

  const scroll = useCallback(() => {
    const { current: currentDOM } = currentRef;

    if (!currentDOM) return;
    const { top, left } = getPos(dom);
    currentDOM.style.top = top;
    currentDOM.style.left = left;
  }, [dom, getPos]);

  useEffect(() => {
    document
      .querySelector(".craftjs-renderer")
      .addEventListener("scroll", scroll);

    return () => {
      document
        .querySelector(".craftjs-renderer")
        .removeEventListener("scroll", scroll);
    };
  }, [scroll]);
  const getCloneTree = useCallback((idToClone) => {
    const tree = query.node(idToClone).toNodeTree();
    const newNodes = {};

    const changeNodeId = (node, newParentId) => {
      const newNodeId = "asdasdas";
      const childNodes = node.data.nodes.map((childId) =>
        changeNodeId(tree.nodes[childId], newNodeId)
      );
      const linkedNodes = Object.keys(node.data.linkedNodes).reduce(
        (accum, id) => {
          const newNodeId1 = changeNodeId(
            tree.nodes[node.data.linkedNodes[id]],
            newNodeId
          );
          return {
            ...accum,
            [id]: newNodeId1,
          };
        },
        {}
      );

      let tmpNode = {
        ...node,
        id: newNodeId,
        data: {
          ...node.data,
          parent: newParentId || node.data.parent,
          nodes: childNodes,
          linkedNodes,
        },
      };
      let freshnode = query.parseFreshNode(tmpNode).toNode();
      newNodes[newNodeId] = freshnode;
      return newNodeId;
    };

    const rootNodeId = changeNodeId(tree.nodes[tree.rootNodeId], newNodes);
    return {
      rootNodeId,
      nodes: newNodes,
    };
  }, []);

  const handleClone = (e, id) => {
    e.preventDefault();
    const theNode = query.node(id).get();
    const parentNode = query.node(theNode.data.parent).get();
    const indexToAdd = parentNode.data.nodes.indexOf(id);
    const tree = getCloneTree(id);
    actions.addNodeTree(tree, parentNode.id, indexToAdd + 1);

    setTimeout(function () {
      actions.deserialize(query.serialize());
      actions.selectNode(tree.rootNodeId);
    }, 100);
  };
  return (
    <>
      {isHover || isActive
        ? ReactDOM.createPortal(
            <IndicatorDiv
              ref={currentRef}
              className="px-2 py-2 text-white bg-blue-400 fixed flex items-center"
              style={{
                left: getPos(dom).left,
                top: getPos(dom).top,
                zIndex: 9999,
              }}
            >
              <h2 className="flex-1 mr-4 text-white">{name}</h2>
              {moveable ? (
                <Btn className="mr-2 cursor-move" ref={drag}>
                  {/* <Move /> */} <DragOutlined className="font-bold" />
                </Btn>
              ) : null}
              {id !== ROOT_NODE && (
                <Btn
                  className="mr-2 cursor-pointer"
                  onClick={() => {
                    actions.selectNode(parent);
                  }}
                >
                  {/* <ArrowUp /> */}
                  <ArrowUpOutlined />
                </Btn>
              )}
              {deletable ? (
                <Btn
                  className="cursor-pointer"
                  onMouseDown={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    actions.delete(id);
                  }}
                >
                  {/* <Delete /> */}
                  <DeleteOutlined />
                </Btn>
              ) : null}
              <Btn
                className="cursor-pointer ml-2"
                onMouseDown={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleClone(e, id);
                }}
              >
                {/* <Delete /> */}
                <ContentCopyIcon />
              </Btn>
            </IndicatorDiv>,
            document.querySelector(".page-container")
          )
        : null}
      {render}
    </>
  );
};
