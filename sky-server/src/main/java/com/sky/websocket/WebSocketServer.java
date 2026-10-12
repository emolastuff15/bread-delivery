package com.sky.websocket;

import org.springframework.stereotype.Component;

import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket服务
 */
@Component
@ServerEndpoint("/ws/{sid}")
public class WebSocketServer {

    //存放会话对象（并发安全：多店员可同时在线）
    private static final Map<String, Session> sessionMap = new ConcurrentHashMap<>();

    /**
     * C端用户连接的 sid 前缀约定。
     * 目前只有管理端连接本端点，因此默认按管理端处理；
     * 将来接入 C 端 WebSocket 时，其 sid 需以 user 开头，避免收到管理端专用提醒。
     */
    private static final String USER_SID_PREFIX = "user";

    /**
     * 连接建立成功调用的方法
     */
    @OnOpen
    public void onOpen(Session session, @PathParam("sid") String sid) {
        System.out.println("客户端：" + sid + "建立连接");
        sessionMap.put(sid, session);
    }

    /**
     * 收到客户端消息后调用的方法
     *
     * @param message 客户端发送过来的消息
     */
    @OnMessage
    public void onMessage(String message, @PathParam("sid") String sid) {
        System.out.println("收到来自客户端：" + sid + "的信息:" + message);
    }

    /**
     * 连接关闭调用的方法
     *
     * @param sid
     */
    @OnClose
    public void onClose(@PathParam("sid") String sid) {
        System.out.println("连接断开:" + sid);
        sessionMap.remove(sid);
    }

    /**
     * 群发（所有连接，兼容原有来单提醒/催单逻辑）
     *
     * @param message
     */
    public void sendToAllClient(String message) {
        send(message, sessionMap.values());
    }

    /**
     * 只推给管理端（跳过 C 端用户连接）
     * 预约提醒等管理端专用消息必须走这个方法，避免推给顾客
     */
    public void sendToAdminClient(String message) {
        send(message, sessionMap.entrySet().stream()
                .filter(e -> !isUserSession(e.getKey()))
                .map(Map.Entry::getValue)
                .collect(java.util.stream.Collectors.toList()));
    }

    /**
     * 是否 C 端用户连接（按 sid 前缀约定判断）
     */
    private static boolean isUserSession(String sid) {
        return sid != null
                && (sid.startsWith(USER_SID_PREFIX + "_")
                || sid.startsWith(USER_SID_PREFIX + "-"));
    }

    private void send(String message, Collection<Session> sessions) {
        for (Session session : sessions) {
            try {
                //服务器向客户端发送消息
                session.getBasicRemote().sendText(message);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

}
